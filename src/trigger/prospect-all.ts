import { task, logger } from "@trigger.dev/sdk/v3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AccountSchema, type Account } from "../schemas.js";
import { prospectAccount } from "./prospect-account.js";
import { z } from "zod";

/**
 * Fan-out task: prospect all accounts in parallel.
 *
 * Uses batchTriggerAndWait to spawn one prospect-account task per account.
 * Each account runs independently with its own retries — if one fails,
 * the others still complete.
 *
 * This is the task you'd trigger from the dashboard for a full run.
 */
export const prospectAllAccounts = task({
  id: "prospect-all-accounts",
  run: async (payload?: { accounts?: Account[] }) => {
    // Either use provided accounts or load from the default data file
    let accounts: Account[];

    if (payload?.accounts && payload.accounts.length > 0) {
      accounts = z.array(AccountSchema).parse(payload.accounts);
      logger.info(`Processing ${accounts.length} provided accounts`);
    } else {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const dataPath = resolve(__dirname, "../../data/accounts.json");
      const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
      accounts = z.array(AccountSchema).parse(raw);
      logger.info(`Loaded ${accounts.length} accounts from data file`);
    }

    // Fan out — each account becomes its own task run
    const batch = await prospectAccount.batchTriggerAndWait(
      accounts.map((account) => ({ payload: account }))
    );

    // batch.runs is the array of TaskRunResult
    const { runs } = batch;

    // Summarize results
    const summary = runs.map((run) => {
      if (run.ok) {
        const { result, quality } = run.output;
        return {
          company: result.company,
          icp_fit: result.icp_fit,
          confidence: result.confidence_score,
          quality_score: quality.quality_score,
          top_value_prop: result.matched_value_props[0]?.value_prop,
          flags: result.flags,
        };
      }
      return { company: "unknown", error: "Task failed" };
    });

    logger.info("All accounts processed", { summary });

    return {
      total: accounts.length,
      succeeded: runs.filter((r) => r.ok).length,
      failed: runs.filter((r) => !r.ok).length,
      summary,
      results: runs
        .filter((r): r is typeof r & { ok: true } => r.ok)
        .map((r) => r.output.result),
    };
  },
});
