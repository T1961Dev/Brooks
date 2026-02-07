import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: run, error } = await supabase
    .from("agent_runs")
    .select("id, status, current_step, progress, output")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (error || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    runId: run.id,
    status: run.status,
    currentStep: run.current_step,
    progress: run.progress ?? 0,
    output: run.output,
  });
}
