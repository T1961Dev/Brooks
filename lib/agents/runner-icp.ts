import { createClient } from "@supabase/supabase-js";
import { ICP_AGENT_STEPS, generateICPOutput, type ICPAgentInput } from "./icp";
import { getStepDataService } from "@/lib/onboarding/data";

const STEP_DURATION_MS = 800;

async function updateRun(
  runId: string,
  update: {
    current_step?: string;
    progress?: number;
    status?: string;
    output?: unknown;
    logs?: unknown[];
  }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase
    .from("agent_runs")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw error;
}

async function appendLog(runId: string, line: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: row } = await supabase
    .from("agent_runs")
    .select("logs")
    .eq("id", runId)
    .single();
  const logs = (row?.logs as string[]) ?? [];
  logs.push(line);
  await supabase.from("agent_runs").update({ logs, updated_at: new Date().toISOString() }).eq("id", runId);
}

export async function runICPAgent(runId: string, userId: string) {
  try {
    const intro = await getStepDataService<{ niche?: string; buyer?: string }>(userId, "icp-introduction");
    const clientsData = await getStepDataService<{ clients?: ICPAgentInput["clients"] }>(userId, "icp-your-best-clients");
    const commonData = await getStepDataService<ICPAgentInput["commonPatterns"]>(userId, "icp-common-patterns");
    const avoidData = await getStepDataService<ICPAgentInput["clientsToAvoid"]>(userId, "icp-clients-to-avoid");

    const input: ICPAgentInput = {
      niche: intro?.niche,
      buyer: intro?.buyer,
      clients: clientsData?.clients,
      commonPatterns: commonData,
      clientsToAvoid: avoidData,
    };

    const total = ICP_AGENT_STEPS.length;
    for (let i = 0; i < total; i++) {
      const step = ICP_AGENT_STEPS[i];
      const progress = Math.round(((i + 1) / total) * 100);
      await updateRun(runId, {
        current_step: step.key,
        progress: i < total - 1 ? Math.round((i / total) * 100) : 100,
      });
      await appendLog(runId, `Completed: ${step.label}`);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
    }

    const output = generateICPOutput(input);
    await updateRun(runId, {
      status: "succeeded",
      progress: 100,
      current_step: ICP_AGENT_STEPS[total - 1].key,
      output: output as unknown as Record<string, unknown>,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("onboarding_steps").upsert(
      {
        user_id: userId,
        step_key: "icp-agent",
        data: {},
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,step_key" }
    );
  } catch (err) {
    await updateRun(runId, { status: "failed" });
    throw err;
  }
}
