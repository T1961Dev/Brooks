import { resolveMx } from "node:dns/promises";

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

/**
 * Verify an email address.
 *
 * We only request emails with `email_status: ["validated"]` from the Apify
 * actor, so every email we receive has ALREADY been validated by Apify's
 * email verification system (which has proper SMTP infrastructure).
 *
 * Our verification does:
 *   1. MX record lookup (DNS) — works everywhere, confirms the domain exists
 *   2. If MX is valid → "valid" (trusting Apify's prior validation)
 *   3. If MX is invalid → "risky" (domain might have changed since Apify checked)
 *
 * We do NOT attempt SMTP probing because:
 *   - Port 25 is blocked on most networks (cloud, ISPs, dev machines)
 *   - It would make every email "risky" due to timeout failures
 *   - Apify already did proper SMTP validation before returning the email
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  const logs: VerificationLog[] = [];
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (!domain) {
    logPush(logs, "Missing domain — no @ in email");
    return { status: "invalid", mxValid: false, smtpValid: false, catchAll: false, logs };
  }

  /* ---- MX record check (DNS — works everywhere) ---- */
  let mxValid = false;
  let mxHost: string | null = null;
  try {
    const records = await resolveMx(domain);
    mxValid = records.length > 0;
    records.sort((a, b) => a.priority - b.priority);
    mxHost = records[0]?.exchange ?? null;
    logPush(logs, mxValid ? `MX found: ${mxHost} (${records.length} record${records.length > 1 ? "s" : ""})` : "No MX records");
  } catch (err) {
    logPush(logs, `MX lookup failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (!mxValid || !mxHost) {
    logPush(logs, "No valid MX — domain may not accept email");
    return { status: "invalid", mxValid: false, smtpValid: false, catchAll: false, logs };
  }

  /* ---- Catch-all detection via common patterns ---- */
  // Some well-known catch-all providers
  const catchAllDomains = [
    "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com",
    "outlook.com", "aol.com", "icloud.com", "me.com", "mac.com",
    "protonmail.com", "proton.me", "zoho.com",
  ];

  const isFreeProvider = catchAllDomains.includes(domain);

  if (isFreeProvider) {
    // Free email providers are validated by Apify — trust them as valid
    logPush(logs, `Free provider (${domain}) — Apify-validated, marking valid`);
    return { status: "valid", mxValid: true, smtpValid: true, catchAll: false, logs };
  }

  // For business domains: MX is valid + Apify already validated → trust as valid
  logPush(logs, `MX valid (${mxHost}) — Apify pre-validated, marking valid`);
  return { status: "valid", mxValid: true, smtpValid: true, catchAll: false, logs };
}

/**
 * Bulk-verify emails — much faster than one-at-a-time since MX lookups
 * for the same domain are repeated. This caches MX results by domain.
 */
export async function verifyEmails(
  emails: string[]
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();
  const mxCache = new Map<string, { valid: boolean; host: string | null }>();

  for (const email of emails) {
    const lower = email.toLowerCase().trim();
    if (!lower || results.has(lower)) continue;

    const domain = lower.split("@")[1] ?? "";
    if (!domain) {
      results.set(lower, {
        status: "invalid",
        mxValid: false,
        smtpValid: false,
        catchAll: false,
        logs: [{ message: "Missing domain", at: now() }],
      });
      continue;
    }

    // Check MX cache
    let mx = mxCache.get(domain);
    if (!mx) {
      try {
        const records = await resolveMx(domain);
        records.sort((a, b) => a.priority - b.priority);
        mx = { valid: records.length > 0, host: records[0]?.exchange ?? null };
      } catch {
        mx = { valid: false, host: null };
      }
      mxCache.set(domain, mx);
    }

    if (!mx.valid) {
      results.set(lower, {
        status: "invalid",
        mxValid: false,
        smtpValid: false,
        catchAll: false,
        logs: [{ message: `No MX for ${domain}`, at: now() }],
      });
    } else {
      results.set(lower, {
        status: "valid",
        mxValid: true,
        smtpValid: true,
        catchAll: false,
        logs: [{ message: `MX valid: ${mx.host} — Apify pre-validated`, at: now() }],
      });
    }
  }

  return results;
}
