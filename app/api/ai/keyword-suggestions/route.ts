import { NextResponse } from "next/server";

type SuggestionKind = "keyword" | "job_title" | "location" | "general";

function fallbackSuggestions(input: string, kind: SuggestionKind): string[] {
  const value = input.trim();
  if (!value) return [];
  const lower = value.toLowerCase();

  const suggestions = new Set<string>([value]);

  if (kind === "keyword" || kind === "general") {
    if (lower.includes("crm")) {
      suggestions.add("CRM software");
      suggestions.add("customer relationship management");
      suggestions.add("customer relationship management platform");
    }
    if (lower.includes("saas")) {
      suggestions.add("software as a service");
      suggestions.add("B2B SaaS");
      suggestions.add("SaaS platform");
    }
    if (lower.includes("startup")) {
      suggestions.add("early-stage startup");
      suggestions.add("venture-backed startup");
    }
  }

  if (kind === "job_title") {
    if (lower === "ceo") suggestions.add("Chief Executive Officer");
    if (lower === "founder") suggestions.add("Founder & CEO");
  }

  return Array.from(suggestions).slice(0, 8);
}

function buildPrompt(kind: SuggestionKind): string {
  if (kind === "job_title") {
    return "Expand this job title into realistic title variants used on LinkedIn profiles.";
  }
  if (kind === "location") {
    return "Expand this location into equivalent geographic variants users might target.";
  }
  return "Expand this keyword into precise B2B search terms and close synonyms.";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawInput = String(body?.input ?? "").trim();
  const kind = (String(body?.kind ?? "keyword").trim() as SuggestionKind) || "keyword";

  if (!rawInput) {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      clarifyingPrompt: `Expand "${rawInput}" with specific terms before saving.`,
      suggestions: fallbackSuggestions(rawInput, kind),
      source: "fallback",
    });
  }

  const system = [
    "You generate practical lead-search expansions for outbound filtering.",
    "Return strict JSON only.",
    "No markdown.",
    "Keep suggestions short and highly relevant.",
  ].join(" ");

  const user = [
    `Input: "${rawInput}"`,
    `Type: ${kind}`,
    "Return JSON with this exact shape:",
    '{"clarifyingPrompt":"string","suggestions":["string"]}',
    "Include 4-8 suggestions max.",
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[AI] keyword-suggestions failed", response.status, text);
      return NextResponse.json({
        clarifyingPrompt: `${buildPrompt(kind)} (${rawInput})`,
        suggestions: fallbackSuggestions(rawInput, kind),
        source: "fallback",
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { clarifyingPrompt?: string; suggestions?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = String(content).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 8)
      : fallbackSuggestions(rawInput, kind);

    return NextResponse.json({
      clarifyingPrompt:
        String(parsed.clarifyingPrompt ?? "").trim() ||
        `${buildPrompt(kind)} (${rawInput})`,
      suggestions,
      source: "openai",
    });
  } catch (error) {
    console.error("[AI] keyword-suggestions exception", error);
    return NextResponse.json({
      clarifyingPrompt: `${buildPrompt(kind)} (${rawInput})`,
      suggestions: fallbackSuggestions(rawInput, kind),
      source: "fallback",
    });
  }
}

