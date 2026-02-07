import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runOfferAgent } from "@/lib/agents/runner-offer";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceNew = url.searchParams.get("forceNew") === "1";

  if (!forceNew) {
    const { data: existing } = await supabase
      .from("agent_runs")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("agent_type", "offer")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({ runId: existing.id, status: "succeeded" });
    }
  }

  const { data: run, error } = await supabase
    .from("agent_runs")
    .insert({
      user_id: user.id,
      agent_type: "offer",
      status: "running",
      current_step: null,
      progress: 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  runOfferAgent(run.id, user.id).catch(() => {});

  return NextResponse.json({ runId: run.id, status: "running" });
}
