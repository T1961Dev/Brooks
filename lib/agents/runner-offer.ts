import { createClient } from "@supabase/supabase-js";
import { OFFER_AGENT_STEPS, generateOfferOutput, type OfferAgentInput } from "./offer";
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
  await supabase
    .from("agent_runs")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", runId);
}

async function appendLog(runId: string, line: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: row } = await supabase.from("agent_runs").select("logs").eq("id", runId).single();
  const logs = (row?.logs as string[]) ?? [];
  logs.push(line);
  await supabase.from("agent_runs").update({ logs, updated_at: new Date().toISOString() }).eq("id", runId);
}

export async function runOfferAgent(runId: string, userId: string) {
  try {
    const introduction = await getStepDataService<OfferAgentInput["introduction"]>(userId, "offer-introduction");
    const specificResults = await getStepDataService<OfferAgentInput["specificResults"]>(userId, "offer-specific-results");
    const implementedProcesses = await getStepDataService<OfferAgentInput["implementedProcesses"]>(userId, "offer-implemented-processes");
    const industryKnowledge = await getStepDataService<OfferAgentInput["industryKnowledge"]>(userId, "offer-industry-knowledge");
    const networkValidation = await getStepDataService<OfferAgentInput["networkValidation"]>(userId, "offer-network-validation");
    const trustedBusinesses = await getStepDataService<OfferAgentInput["trustedBusinesses"]>(userId, "offer-trusted-businesses");
    const credibilityLeverage = await getStepDataService<OfferAgentInput["credibilityLeverage"]>(userId, "offer-credibility-leverage");

    const input: OfferAgentInput = {
      introduction,
      specificResults,
      implementedProcesses,
      industryKnowledge,
      networkValidation,
      trustedBusinesses,
      credibilityLeverage,
    };

    const total = OFFER_AGENT_STEPS.length;
    for (let i = 0; i < total; i++) {
      const step = OFFER_AGENT_STEPS[i];
      await updateRun(runId, {
        current_step: step.key,
        progress: i < total - 1 ? Math.round((i / total) * 100) : 100,
      });
      await appendLog(runId, `Completed: ${step.label}`);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
    }

    const output = generateOfferOutput(input);
    await updateRun(runId, {
      status: "succeeded",
      progress: 100,
      current_step: OFFER_AGENT_STEPS[total - 1].key,
      output: output as unknown as Record<string, unknown>,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("onboarding_steps").upsert(
      {
        user_id: userId,
        step_key: "offer-agent",
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
