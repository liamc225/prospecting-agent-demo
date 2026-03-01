/**
 * Generate pre-computed prospecting results for showcase accounts.
 * Run: node scripts/generate-showcase.mjs
 *
 * Uses the same system prompt + tool_use pattern as the trigger.dev tasks.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// Load accounts
const accounts = JSON.parse(
  readFileSync(join(ROOT, "data", "accounts.json"), "utf-8")
);

// Pick 3 showcase accounts: health system, university, logistics
const SHOWCASE_IDS = [1, 2, 8];
const showcaseAccounts = accounts.filter((a) => SHOWCASE_IDS.includes(a.id));

// Load system prompt from config.ts (extract the template literal)
const configSource = readFileSync(join(ROOT, "src", "config.ts"), "utf-8");
const promptMatch = configSource.match(
  /export const SYSTEM_PROMPT = `([\s\S]*?)`;/
);
if (!promptMatch) throw new Error("Could not extract SYSTEM_PROMPT");
const SYSTEM_PROMPT = promptMatch[1];

// ProspectingOutput JSON schema (matching the Zod schema)
const PROSPECTING_SCHEMA = {
  type: "object",
  properties: {
    account_id: { type: "number" },
    company: { type: "string" },
    icp_fit: {
      type: "string",
      enum: ["strong_fit", "moderate_fit", "weak_fit", "disqualify"],
    },
    icp_reasoning: { type: "string" },
    matched_value_props: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value_prop: {
            type: "string",
            enum: [
              "total_cost_of_care_reduction",
              "eap_upgrade",
              "workforce_productivity",
              "employee_access_and_experience",
            ],
          },
          relevance_score: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
        },
        required: ["value_prop", "relevance_score", "reasoning"],
      },
    },
    email_framework: {
      type: "string",
      enum: [
        "do_the_maths",
        "short_trigger",
        "challenge_of_similar_companies",
        "neutral_insight",
        "leader_responsibilities",
      ],
    },
    email_subject: { type: "string" },
    email_body: { type: "string" },
    discovery_questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["question", "rationale"],
      },
    },
    confidence_score: { type: "number", minimum: 0, maximum: 1 },
    flags: { type: "array", items: { type: "string" } },
    sparse_data_handling: { type: ["string", "null"] },
    benefits_intelligence: { type: ["string", "null"] },
  },
  required: [
    "account_id",
    "company",
    "icp_fit",
    "icp_reasoning",
    "matched_value_props",
    "email_framework",
    "email_subject",
    "email_body",
    "discovery_questions",
    "confidence_score",
    "flags",
  ],
};

function buildAccountContext(account) {
  const employeeCount = account.us_employees.toLocaleString("en-US");
  const contact = account.contact_name
    ? `${account.contact_name} — ${account.contact_title ?? "Unknown title"}`
    : "No contact identified";

  return `Analyze this account and produce a prospecting output:

Company: ${account.company}
Industry: ${account.industry}
US Employees: ${employeeCount}
Contact: ${contact}
Health Plan: ${account.health_plan}
Notes: ${account.notes}

Produce a complete ProspectingOutput with all fields populated.`;
}

function evaluateOutput(output) {
  const checks = {
    has_value_prop_match: output.matched_value_props.length > 0,
    has_reasoning: output.matched_value_props.every((vp) => vp.reasoning),
    email_under_150_words: output.email_body.split(/\s+/).length <= 150,
    has_discovery_questions: output.discovery_questions.length >= 2,
    has_icp_assessment: [
      "strong_fit",
      "moderate_fit",
      "weak_fit",
      "disqualify",
    ].includes(output.icp_fit),
    confidence_above_threshold: output.confidence_score >= 0.6,
    email_suppression_justified:
      output.email_body === ""
        ? output.sparse_data_handling != null ||
          output.icp_fit === "weak_fit" ||
          output.icp_fit === "disqualify"
        : true,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, quality_score: passed / Object.keys(checks).length };
}

async function runProspecting(account) {
  const client = new Anthropic();

  console.log(`  Processing: ${account.company}...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAccountContext(account) }],
    tools: [
      {
        name: "prospecting_output",
        description:
          "Structured prospecting output for an employer account. You MUST call this tool with your complete analysis.",
        input_schema: PROSPECTING_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "prospecting_output" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock) throw new Error(`No tool_use for ${account.company}`);

  const result = toolBlock.input;

  // Post-processing gates (same as src/prospecting.ts)
  result.account_id = account.id;
  if (!result.flags) result.flags = [];

  if (!account.contact_name) {
    result.email_subject = "";
    result.email_body = "";
    if (!result.flags.some((f) => f.toLowerCase().includes("no contact"))) {
      result.flags.push("No contact identified — outreach cannot proceed");
    }
  }

  if (result.icp_fit === "weak_fit" || result.icp_fit === "disqualify") {
    result.email_subject = "";
    result.email_body = "";
    if (
      !result.flags.some(
        (f) =>
          f.toLowerCase().includes("weak") ||
          f.toLowerCase().includes("disqualif")
      )
    ) {
      result.flags.push(
        `Account is ${result.icp_fit} — email suppressed, route to human review`
      );
    }
  }

  const quality = evaluateOutput(result);
  console.log(
    `  ${account.company}: ${result.icp_fit} | ${(result.confidence_score * 100).toFixed(0)}% confidence | ${(quality.quality_score * 100).toFixed(0)}% quality`
  );

  return { account, result, quality };
}

async function main() {
  console.log("Generating showcase results for 3 accounts...\n");

  const results = [];
  for (const account of showcaseAccounts) {
    const entry = await runProspecting(account);
    results.push(entry);
  }

  const outputPath = join(__dirname, "..", "data", "showcase.json");
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outputPath}`);
}

main().catch(console.error);
