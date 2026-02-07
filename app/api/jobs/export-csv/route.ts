import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("lead_jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: leads } = await supabase
    .from("leads")
    .select("email, first_name, last_name, title, company, domain, location, verification_status, export_status")
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const rows = (leads ?? []).map((l) => ({
    email: l.email ?? "",
    first_name: l.first_name ?? "",
    last_name: l.last_name ?? "",
    title: l.title ?? "",
    company: l.company ?? "",
    domain: l.domain ?? "",
    location: l.location ?? "",
    verification_status: l.verification_status ?? "",
    export_status: l.export_status ?? "",
  }));

  const headers = ["email", "first_name", "last_name", "title", "company", "domain", "location", "verification_status", "export_status"];
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-${jobId}-leads.csv"`,
    },
  });
}
