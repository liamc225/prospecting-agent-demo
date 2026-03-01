import { task, logger } from "@trigger.dev/sdk/v3";
import { AccountSchema, type Account } from "../schemas.js";
import { runProspectingAgent, evaluateOutput } from "../prospecting.js";

/**
 * Prospect a single account.
 *
 * Trigger.dev handles retries (configured in trigger.config.ts).
 * Each account runs as an independent task — visible in the dashboard
 * with its own status, duration, and output.
 */
export const prospectAccount = task({
  id: "prospect-account",
  run: async (payload: Account) => {
    // Validate input (catches bad payloads from manual triggers)
    const account = AccountSchema.parse(payload);

    logger.info(`Processing: ${account.company}`, {
      industry: account.industry,
      employees: account.us_employees,
    });

    const result = await runProspectingAgent(account);

    const quality = evaluateOutput(result);
    logger.info(`${account.company} — Quality: ${(quality.quality_score * 100).toFixed(0)}%`, {
      icp_fit: result.icp_fit,
      confidence: result.confidence_score,
      top_value_prop: result.matched_value_props[0]?.value_prop,
      flags: result.flags,
      quality_checks: quality.checks,
    });

    return { result, quality };
  },
});
