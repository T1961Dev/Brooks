import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("lead_jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "email, first_name, last_name, title, company, domain, industry, location, linkedin_url, verification_status, export_status, enriched"
    )
    .eq("job_id", jobId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const rows = (leads ?? []).map((l) => {
    const e = (l.enriched ?? {}) as Record<string, unknown>;
    return {
      email: l.email ?? "",
      first_name: l.first_name ?? "",
      last_name: l.last_name ?? "",
      job_title: l.title ?? "",
      company: l.company ?? "",
      domain: l.domain ?? "",
      industry: l.industry ?? "",
      location: l.location ?? "",
      linkedin: l.linkedin_url ?? (e.linkedin_url as string) ?? "",
      company_size: e.company_size != null ? String(e.company_size) : "",
      company_revenue: (e.company_annual_revenue_clean as string) ?? "",
      company_website: (e.website as string) ?? "",
      company_technologies: (e.company_technologies as string) ?? "",
      seniority_level: (e.seniority_level as string) ?? "",
      headline: (e.headline as string) ?? "",
      mobile_number: (e.mobile_number as string) ?? "",
      verification_status: l.verification_status ?? "",
      export_status: l.export_status ?? "",
    };
  });

  const headers = [
    "email",
    "first_name",
    "last_name",
    "job_title",
    "company",
    "domain",
    "industry",
    "location",
    "linkedin",
    "company_size",
    "company_revenue",
    "company_website",
    "company_technologies",
    "seniority_level",
    "headline",
    "mobile_number",
    "verification_status",
    "export_status",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h as keyof typeof r] ?? "").replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    ),
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-${jobId}-leads.csv"`,
    },
  });
}
