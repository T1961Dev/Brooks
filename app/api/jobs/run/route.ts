import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runActorAndFetchItems,
} from "@/lib/integrations/apify";
import {
  buildLegacyActorInput,
  type LegacyActorOverrides,
  validateLegacyActorInput,
} from "@/lib/integrations/apify-mapping";
import { setJobStepStatus, updateJob } from "@/lib/jobs/orchestrator";

export const maxDuration = 300;

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
    };
  }
  return {
    message: "Unknown non-Error thrown",
    value: err,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const jobId = (body.jobId as string | undefined)?.trim();
  const runCity = (body.city as string | undefined)?.trim() || null;
  const actorFilters = (body.actorFilters as LegacyActorOverrides | undefined) ?? {};
  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  /* ---- Load job ---- */
  const { data: job } = await supabase
    .from("lead_jobs")
    .select(
      "id, icp_id, client_id, batch_size, requested_lead_count, status, source"
    )
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  /* ---- Load ICP ---- */
  const { data: icp } = await supabase
    .from("icp_profiles")
    .select(
      "job_titles, industries, industry_keywords, geography, headcount_brackets, headcount_min, headcount_max, technologies, client_id, company_type, revenue_min, revenue_max"
    )
    .eq("id", job.icp_id)
    .eq("user_id", user.id)
    .single();

  if (!icp) {
    return NextResponse.json({ error: "ICP not found" }, { status: 404 });
  }
  if (icp.client_id && job.client_id && icp.client_id !== job.client_id) {
    return NextResponse.json(
      { error: "ICP does not match client" },
      { status: 400 }
    );
  }

  try {
    /* ---- Map ICP → actor input ---- */
    const fetchCount = job.requested_lead_count ?? job.batch_size ?? 100;
    const actorInput = buildLegacyActorInput(icp, fetchCount, {
      ...actorFilters,
      city: runCity ?? actorFilters.city ?? null,
    });
    const actorInputIssues = validateLegacyActorInput(actorInput);
    if (actorInputIssues.length > 0) {
      const message = `Actor input is invalid: ${actorInputIssues.join("; ")}`;
      await setJobStepStatus(supabase, jobId, "scrape", "failed", {
        error: message,
        actorInput,
      });
      await updateJob(supabase, jobId, {
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
      });
      return NextResponse.json({ error: message, actorInput }, { status: 422 });
    }

    console.log("[Run] ICP filters →", {
      industries: icp.industries,
      industry_keywords: icp.industry_keywords,
      job_titles: icp.job_titles,
      geography: icp.geography,
      company_type: icp.company_type,
      headcount_brackets: icp.headcount_brackets,
      revenue: `${icp.revenue_min ?? "any"}-${icp.revenue_max ?? "any"}`,
      actorOverrides: actorFilters,
      actorInput,
    });

    /* ---- Mark scrape step running ---- */
    await setJobStepStatus(supabase, jobId, "scrape", "running");
    await updateJob(supabase, jobId, {
      status: "running",
      progress_step: "scrape",
      progress_percent: 5,
      started_at: new Date().toISOString(),
    });

    // Run the actor and fetch items in one go (matches reference pattern)
    const result = await runActorAndFetchItems(actorInput);

    if (result.items.length === 0) {
      await setJobStepStatus(supabase, jobId, "scrape", "failed", {
        error: "Apify actor returned 0 results for this search criteria",
      });
      await updateJob(supabase, jobId, {
        status: "failed",
        error:
          "Apify returned 0 results. The search criteria may be too restrictive, or there are no matches in the database for this combination of keywords, location, size, and titles.",
        finished_at: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error:
            "Apify returned 0 results for this search criteria. Try broadening your ICP filters.",
          runId: result.runId,
          datasetId: result.datasetId,
        },
        { status: 422 }
      );
    }

    // Log industry distribution from results for debugging
    const industryDist: Record<string, number> = {};
    for (const item of result.items.slice(0, 200)) {
      const ind = (item.industry ?? "unknown").toString();
      industryDist[ind] = (industryDist[ind] ?? 0) + 1;
    }
    console.log("[Run] Industry distribution from actor:", industryDist);

    await setJobStepStatus(supabase, jobId, "scrape", "succeeded");
    await updateJob(supabase, jobId, {
      apify_run_id: result.runId,
      apify_dataset_id: result.datasetId,
      status: "running",
      progress_step: "scrape",
      progress_percent: 35,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      datasetId: result.datasetId,
      itemCount: result.items.length,
      scrapeComplete: true,
    });
  } catch (err) {
    console.error("[Run] /api/jobs/run failed", {
      jobId,
      runCity,
      error: serializeError(err),
    });

    await setJobStepStatus(supabase, jobId, "scrape", "failed", {
      error: err instanceof Error ? err.message : "Apify run failed",
    });
    await updateJob(supabase, jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Apify run failed",
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apify run failed" },
      { status: 500 }
    );
  }
}
