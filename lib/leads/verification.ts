import { resolveMx } from "node:dns/promises";
import net from "node:net";

export interface VerificationLog {
  message: string;
  at: string;
}

export interface VerificationResult {
  status: "valid" | "catch_all" | "invalid" | "risky";
  mxValid: boolean;
  smtpValid: boolean;
  catchAll: boolean;
  logs: VerificationLog[];
}

function now() {
  return new Date().toISOString();
}

function logPush(logs: VerificationLog[], message: string) {
  logs.push({ message, at: now() });
}

function parseCode(line: string) {
  const match = line.trim().match(/^(\d{3})/);
  return match ? Number(match[1]) : null;
}

async function smtpCommand(
  socket: net.Socket,
  command: string
): Promise<{ code: number | null; response: string }> {
  return new Promise((resolve, reject) => {
    let data = "";
    const onData = (chunk: Buffer) => {
      data += chunk.toString();
      if (data.includes("\n")) {
        socket.off("data", onData);
        const line = data.split("\n")[0] ?? "";
        resolve({ code: parseCode(line), response: data.trim() });
      }
    };
    socket.on("data", onData);
    socket.write(`${command}\r\n`, (err) => {
      if (err) reject(err);
    });
  });
}

async function smtpProbe(mxHost: string, email: string): Promise<{ smtpValid: boolean; catchAll: boolean; logs: string[] }> {
  const logs: string[] = [];
  const domain = email.split("@")[1] ?? "";
  const randomLocal = `probe_${Math.random().toString(36).slice(2, 10)}`;
  const randomEmail = `${randomLocal}@${domain}`;

  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    const timeout = setTimeout(() => {
      logs.push("SMTP timeout");
      socket.destroy();
      resolve({ smtpValid: false, catchAll: false, logs });
    }, 7000);

    socket.on("error", (err) => {
      logs.push(`SMTP error: ${err.message}`);
      clearTimeout(timeout);
      resolve({ smtpValid: false, catchAll: false, logs });
    });

    socket.on("data", () => {
      // handled in smtpCommand
    });

    socket.on("connect", async () => {
      try {
        const banner = await smtpCommand(socket, "");
        logs.push(`Banner: ${banner.response}`);

        const helo = await smtpCommand(socket, "HELO example.com");
        logs.push(`HELO: ${helo.response}`);

        const mailFrom = await smtpCommand(socket, "MAIL FROM:<verify@example.com>");
        logs.push(`MAIL FROM: ${mailFrom.response}`);

        const rcptTarget = await smtpCommand(socket, `RCPT TO:<${email}>`);
        logs.push(`RCPT target: ${rcptTarget.response}`);

        const rcptRandom = await smtpCommand(socket, `RCPT TO:<${randomEmail}>`);
        logs.push(`RCPT random: ${rcptRandom.response}`);

        await smtpCommand(socket, "QUIT");
        socket.end();

        const targetAccepted = rcptTarget.code === 250;
        const randomAccepted = rcptRandom.code === 250;
        clearTimeout(timeout);
        resolve({ smtpValid: targetAccepted, catchAll: randomAccepted, logs });
      } catch (err) {
        logs.push(`SMTP exception: ${err instanceof Error ? err.message : "unknown"}`);
        clearTimeout(timeout);
        resolve({ smtpValid: false, catchAll: false, logs });
      }
    });
  });
}

export async function verifyEmail(email: string): Promise<VerificationResult> {
  const logs: VerificationLog[] = [];
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) {
    logPush(logs, "Missing domain");
    return { status: "invalid", mxValid: false, smtpValid: false, catchAll: false, logs };
  }

  let mxValid = false;
  let mxHost: string | null = null;
  try {
    const records = await resolveMx(domain);
    mxValid = records.length > 0;
    records.sort((a, b) => a.priority - b.priority);
    mxHost = records[0]?.exchange ?? null;
    logPush(logs, mxValid ? `MX found: ${mxHost}` : "No MX records");
  } catch (err) {
    logPush(logs, `MX lookup failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (!mxValid || !mxHost) {
    return { status: "invalid", mxValid: false, smtpValid: false, catchAll: false, logs };
  }

  const smtp = await smtpProbe(mxHost, email);
  smtp.logs.forEach((entry) => logPush(logs, entry));

  if (!smtp.smtpValid) {
    return { status: "risky", mxValid: true, smtpValid: false, catchAll: smtp.catchAll, logs };
  }
  if (smtp.catchAll) {
    return { status: "catch_all", mxValid: true, smtpValid: true, catchAll: true, logs };
  }
  return { status: "valid", mxValid: true, smtpValid: true, catchAll: false, logs };
}
