import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Replace with your project ref from trigger.dev dashboard
  project: "proj_krxytwdrsvlfylcyuqtz",
  runtime: "node",
  logLevel: "log",
  // Max execution time per task (seconds). 300s = 5 min, plenty for Claude API calls.
  maxDuration: 300,
  // All task files live under src/trigger/
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
