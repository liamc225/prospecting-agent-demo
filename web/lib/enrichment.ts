import Anthropic from "@anthropic-ai/sdk";
import type { Account } from "./types";

// ── Tavily search ───────────────────────────────────────────

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

async function searchCompany(company: string): Promise<TavilyResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `"${company}" employer employees industry health insurance benefits mental health`,
      max_results: 5,
      search_depth: "basic",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status} ${res.statusText}`);
  }

  const data: TavilyResponse = await res.json();
  return data.results;
}

// ── Claude structuring ──────────────────────────────────────

const ACCOUNT_TOOL = {
  name: "create_account",
  description:
    "Extract structured employer account data from web search results.",
  input_schema: {
    type: "object" as const,
    properties: {
      company: {
        type: "string",
        description: "Official company name",
      },
      industry: {
        type: "string",
        description:
          "Industry sector (e.g., Healthcare, Education, Financial services, Technology, Manufacturing, Transportation/logistics)",
      },
      us_employees: {
        type: "number",
        description:
          "Estimated US employee count. Use best estimate from search results. Default to 5000 if no data found.",
      },
      contact_name: {
        type: ["string", "null"],
        description:
          "Name of a relevant HR/Benefits/People leader if found. null if not found.",
      },
      contact_title: {
        type: ["string", "null"],
        description: "Title of the contact if found. null if not found.",
      },
      health_plan: {
        type: "string",
        description:
          "Health insurance carrier if found (e.g., Anthem, Aetna, Cigna, UnitedHealthcare, BCBS). Use 'Unknown' if not found.",
      },
      notes: {
        type: "string",
        description:
          "Key context for prospecting: EAP status, mental health initiatives, workforce characteristics, recent news. 2-3 sentences.",
      },
    },
    required: [
      "company",
      "industry",
      "us_employees",
      "contact_name",
      "contact_title",
      "health_plan",
      "notes",
    ],
  },
};

export async function enrichCompany(company: string): Promise<Account> {
  const searchResults = await searchCompany(company);

  const context = searchResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}\n`
    )
    .join("\n---\n");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [ACCOUNT_TOOL],
    tool_choice: { type: "tool", name: "create_account" },
    messages: [
      {
        role: "user",
        content: `You are extracting structured employer account data for a B2B sales prospecting tool focused on mental health benefits.

Given web search results about "${company}", extract the key fields. Be honest about what you can and cannot find — use null for missing contacts and "Unknown" for missing health plan info.

Focus on:
- Official company name and industry
- US employee count (look for headcount, "employees", workforce size)
- HR/Benefits leadership contacts if mentioned
- Health insurance carrier
- Any mental health, EAP, or wellness program context

Search results:
${context}`,
      },
    ],
  });

  // Extract the tool use result
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured account data");
  }

  const input = toolUse.input as Record<string, unknown>;

  return {
    id: 99, // Ad-hoc enrichment
    company: input.company as string,
    industry: input.industry as string,
    us_employees: input.us_employees as number,
    contact_name: (input.contact_name as string) ?? null,
    contact_title: (input.contact_title as string) ?? null,
    health_plan: input.health_plan as string,
    notes: input.notes as string,
  };
}
