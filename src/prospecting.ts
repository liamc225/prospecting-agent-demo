import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  type Account,
  ProspectingOutputSchema,
  type ProspectingOutput,
  type QualityResult,
} from "./schemas.js";
import { MODEL, SYSTEM_PROMPT } from "./config.js";

const client = new Anthropic();

/**
 * Build the user message for Claude from an account object.
 */
function buildAccountContext(account: Account): string {
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

/**
 * Call Claude with tool_use to get structured prospecting output.
 *
 * Uses the "forced tool call" pattern: define a tool whose input_schema
 * matches ProspectingOutput, then set tool_choice to force Claude to use it.
 * This guarantees structured JSON output matching the Zod schema.
 */
export async function runProspectingAgent(
  account: Account
): Promise<ProspectingOutput> {
  const jsonSchema = zodToJsonSchema(ProspectingOutputSchema, {
    $refStrategy: "none",
    target: "openApi3",
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAccountContext(account) }],
    tools: [
      {
        name: "prospecting_output",
        description:
          "Structured prospecting output for an employer account. You MUST call this tool with your complete analysis.",
        input_schema: jsonSchema as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: "prospecting_output" },
  });

  // Extract the tool_use block
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error(
      `No tool_use block in response for ${account.company}. ` +
        `Got: ${response.content.map((b) => b.type).join(", ")}`
    );
  }

  // Validate with Zod — this catches any schema mismatches
  const result = ProspectingOutputSchema.parse(toolBlock.input);

  // ── Post-processing gates ───────────────────────────────────
  // These are hard-coded business rules, NOT LLM decisions.

  // Override account_id — don't trust the LLM to echo it correctly
  result.account_id = account.id;

  // Flag when no contact is identified (email preserved as draft)
  if (!account.contact_name) {
    if (!result.flags.some((f) => f.toLowerCase().includes("no contact"))) {
      result.flags.push(
        "No contact identified — email is a draft, needs a named recipient before sending"
      );
    }
  }

  // Suppress email for weak-fit or disqualified accounts
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

  return result;
}

/**
 * Evaluate the quality of a prospecting output.
 * Returns a score (0-1) and individual check results.
 */
export function evaluateOutput(output: ProspectingOutput): QualityResult {
  const checks: Record<string, boolean> = {
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
  const quality_score = passed / Object.keys(checks).length;

  return { checks, quality_score };
}
