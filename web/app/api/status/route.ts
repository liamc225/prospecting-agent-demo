import { NextRequest, NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json(
      { error: "runId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const run = await runs.retrieve(runId);

    return NextResponse.json({
      status: run.status,
      output: run.status === "COMPLETED" ? run.output : undefined,
    });
  } catch (err) {
    console.error("Status API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
