export const ICP_AGENT_STEPS = [
  { key: "analyzing", label: "Analyzing past client data", description: "Examining your best clients to identify the industries, company characteristics, and pain points that led to successful engagements.", pill: "Analysis" },
  { key: "patterns", label: "Identifying success patterns", description: "Discovering common demographic and psychographic patterns across your most profitable and easiest-to-work-with clients.", pill: "Research" },
  { key: "mapping", label: "Mapping client problems to solutions", description: "Connecting the problems your best clients had with the solutions you delivered.", pill: "Mapping" },
  { key: "profitability", label: "Evaluating profitability factors", description: "Assessing what made these clients profitable and low-maintenance.", pill: "Validation" },
  { key: "decision_makers", label: "Profiling decision makers", description: "Identifying the roles and characteristics of the people who bought from you.", pill: "Profiling" },
  { key: "recommendations", label: "Generating ICP recommendations", description: "Creating your top 3 Ideal Customer Profile recommendations based on proven success patterns from your best past clients.", pill: "Results" },
] as const;

export type ICPStepKey = (typeof ICP_AGENT_STEPS)[number]["key"];

export interface ICPAgentInput {
  niche?: string;
  buyer?: string;
  clients?: Array<{ industry: string; problem: string; results: string }>;
  commonPatterns?: {
    inCommon?: string;
    easyProfitable?: string;
    minimumSolution?: string;
  };
  clientsToAvoid?: { redFlags?: string; checkboxes?: string[] };
}

export interface ICPRecommendation {
  title: string;
  description: string;
  industries: string[];
  companySize: string;
  painPoints: string[];
  decisionMakerRole: string;
}

export interface ICPAgentOutput {
  recommendations: ICPRecommendation[];
  summary: string;
  raw: Record<string, unknown>;
}

export function generateICPOutput(input: ICPAgentInput): ICPAgentOutput {
  const niche = input.niche || "B2B services";
  const buyer = input.buyer || "Decision makers";
  const clients = input.clients ?? [];
  const common = input.commonPatterns;
  const avoid = input.clientsToAvoid?.redFlags ?? "";

  const industries = Array.from(
    new Set(clients.map((c) => c.industry || "General").filter(Boolean))
  );
  const painPoints = Array.from(
    new Set(clients.map((c) => c.problem || "Growth").filter(Boolean))
  );
  const results = clients.map((c) => c.results).filter(Boolean);

  const recommendations: ICPRecommendation[] = [
    {
      title: `Primary ICP: ${niche}`,
      description: `Ideal customer profile derived from your best clients. Target: ${buyer}. Common outcomes: ${results.slice(0, 2).join("; ") || "Improved results"}.`,
      industries: industries.length ? industries : [niche],
      companySize: "10-100 employees",
      painPoints: painPoints.length ? painPoints : ["Growth plateau", "Need for expertise"],
      decisionMakerRole: buyer,
    },
  ];

  if (common?.inCommon) {
    recommendations[0].description += ` Patterns: ${common.inCommon.slice(0, 120)}...`;
  }

  const summary = [
    `**Ideal Customer Profile**`,
    ``,
    `**Target:** ${buyer} in ${niche}`,
    `**Industries:** ${recommendations[0].industries.join(", ")}`,
    `**Company size:** ${recommendations[0].companySize}`,
    `**Pain points:** ${recommendations[0].painPoints.join(", ")}`,
    ``,
    avoid ? `**Clients to avoid:** ${avoid.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    recommendations,
    summary,
    raw: {
      input,
      generatedAt: new Date().toISOString(),
    },
  };
}
