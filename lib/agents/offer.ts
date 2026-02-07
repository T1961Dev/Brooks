export const OFFER_AGENT_STEPS = [
  { key: "summarizing", label: "Summarizing offer inputs", description: "Consolidating your offer details into a single structured summary.", pill: "Analysis" },
  { key: "positioning", label: "Converting to clear positioning", description: "Turning your inputs into clear market positioning.", pill: "Research" },
  { key: "value_props", label: "Writing value props and proof blocks", description: "Drafting value propositions and proof points.", pill: "Mapping" },
  { key: "landing_page", label: "Drafting landing page copy", description: "Creating headline, subhead, and CTA sections.", pill: "Validation" },
  { key: "cold_angles", label: "Drafting cold email angles", description: "Writing 5 cold email angles for outbound.", pill: "Profiling" },
  { key: "final_package", label: "Generating final offer package", description: "Assembling the complete offer package with objection handling.", pill: "Results" },
] as const;

export type OfferStepKey = (typeof OFFER_AGENT_STEPS)[number]["key"];

export interface OfferAgentInput {
  introduction?: { name?: string; promise?: string; priceRange?: string; timeline?: string };
  specificResults?: { outcomes?: string[]; metrics?: string };
  implementedProcesses?: { steps?: string; tools?: string };
  industryKnowledge?: { industries?: string; proofPoints?: string };
  networkValidation?: { communities?: string; partnerships?: string };
  trustedBusinesses?: { logos?: string; caseStudies?: string };
  credibilityLeverage?: { founderStory?: string; proofAssets?: string; testimonials?: string };
}

export interface OfferAgentOutput {
  positioning: string;
  landingPageCopy: {
    headline: string;
    subhead: string;
    cta: string;
  };
  coldEmailAngles: string[];
  objectionHandling: string[];
  summary: string;
  raw: Record<string, unknown>;
}

export function generateOfferOutput(input: OfferAgentInput): OfferAgentOutput {
  const intro = input.introduction ?? {};
  const name = intro.name || "Our Offer";
  const promise = intro.promise || "We help you achieve results.";
  const price = intro.priceRange || "Custom pricing";
  const timeline = intro.timeline || "60-90 days";

  const outcomes = input.specificResults?.outcomes ?? [];
  const metrics = input.specificResults?.metrics ?? "";
  const steps = input.implementedProcesses?.steps ?? "";
  const tools = input.implementedProcesses?.tools ?? "";
  const industries = input.industryKnowledge?.industries ?? "";
  const proof = input.industryKnowledge?.proofPoints ?? "";
  const communities = input.networkValidation?.communities ?? "";
  const partnerships = input.networkValidation?.partnerships ?? "";
  const logos = input.trustedBusinesses?.logos ?? "";
  const caseStudies = input.trustedBusinesses?.caseStudies ?? "";
  const founderStory = input.credibilityLeverage?.founderStory ?? "";
  const proofAssets = input.credibilityLeverage?.proofAssets ?? "";
  const testimonials = input.credibilityLeverage?.testimonials ?? "";

  const positioning = `${name}: ${promise} Price: ${price}. Delivery: ${timeline}. ${outcomes.length ? "Key outcomes: " + outcomes.slice(0, 3).join(", ") : ""} ${metrics ? "Metrics: " + metrics : ""}`;

  const landingPageCopy = {
    headline: promise,
    subhead: `${name} delivers results in ${timeline}. ${industries ? "Ideal for " + industries : ""}`,
    cta: "Book a call",
  };

  const coldEmailAngles = [
    `Results angle: ${promise} – we've helped similar companies achieve ${metrics || "measurable results"}.`,
    `Process angle: We use a proven process (${steps ? steps.slice(0, 80) + "..." : "discovery → implementation → results"}) so you get outcomes without the guesswork.`,
    `Proof angle: ${proof || "Trusted by businesses in your space."} ${caseStudies ? "Case studies available." : ""}`,
    `Speed angle: Get from where you are to where you want to be in ${timeline}.`,
    `Founder angle: ${founderStory || "Direct access to the team that delivers."}`,
  ].slice(0, 5);

  const objectionHandling = [
    "Timeline: We outline clear milestones so you see progress within the first 30 days.",
    "Investment: Pricing is aligned with the value and outcomes we deliver.",
    "Fit: We focus on [your niche] so we're not a generic solution.",
    "Proof: We can share case studies and references from similar clients.",
  ];

  const summary = [
    `**Offer: ${name}**`,
    ``,
    `**Positioning:** ${positioning.slice(0, 300)}`,
    ``,
    `**Landing page:** ${landingPageCopy.headline} | ${landingPageCopy.subhead} | CTA: ${landingPageCopy.cta}`,
    ``,
    `**Cold email angles:** ${coldEmailAngles.length} angles generated.`,
    ``,
    `**Proof:** ${proof ? proof.slice(0, 150) : "Add proof points in Industry Knowledge."} ${testimonials ? "Testimonials included." : ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    positioning,
    landingPageCopy,
    coldEmailAngles,
    objectionHandling,
    summary,
    raw: {
      input,
      generatedAt: new Date().toISOString(),
    },
  };
}
