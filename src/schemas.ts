import { z } from "zod";

// ── Input schema ──────────────────────────────────────────────

export const AccountSchema = z.object({
  id: z.number(),
  company: z.string(),
  industry: z.string(),
  us_employees: z.number(),
  contact_name: z.string().nullable(),
  contact_title: z.string().nullable(),
  health_plan: z.string(),
  notes: z.string(),
});

export type Account = z.infer<typeof AccountSchema>;

// ── Output schemas ────────────────────────────────────────────

export const ValueProp = z.enum([
  "total_cost_of_care_reduction",
  "eap_upgrade",
  "workforce_productivity",
  "employee_access_and_experience",
]);

export const ValuePropMatchSchema = z.object({
  value_prop: ValueProp,
  relevance_score: z.number().min(0).max(1).describe("0-1 relevance score"),
  reasoning: z.string(),
});

export const DiscoveryQuestionSchema = z.object({
  question: z.string(),
  rationale: z
    .string()
    .describe("Why this question matters for this specific account"),
});

export const EmailFramework = z.enum([
  "pain_led",
  "insight_led",
]);

export const IcpFit = z.enum([
  "strong_fit",
  "moderate_fit",
  "weak_fit",
  "disqualify",
]);

export const ProspectingOutputSchema = z.object({
  account_id: z.number(),
  company: z.string(),
  icp_fit: IcpFit,
  icp_reasoning: z.string(),
  matched_value_props: z.array(ValuePropMatchSchema),
  email_framework: EmailFramework,
  email_subject: z.string(),
  email_body: z.string(),
  discovery_questions: z.array(DiscoveryQuestionSchema),
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall confidence in output quality"),
  flags: z
    .array(z.string())
    .default([])
    .describe("Issues requiring human review"),
  sparse_data_handling: z
    .string()
    .nullable()
    .optional()
    .describe("How sparse data was handled"),
  benefits_intelligence: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Current mental health vendors, EAP provider, and benefits stack findings"
    ),
});

export type ProspectingOutput = z.infer<typeof ProspectingOutputSchema>;

// ── Quality evaluation ────────────────────────────────────────

export interface QualityResult {
  checks: Record<string, boolean>;
  quality_score: number;
}
