"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, Suspense } from "react";
import { ShowcaseSection } from "@/components/showcase-section";
import type { ShowcaseEntry } from "@/components/showcase-section";
import { SearchForm } from "@/components/search-form";
import { EnrichmentPreview } from "@/components/enrichment-preview";
import { ProspectResults } from "@/components/prospect-results";
import type { Account, ProspectAccountResult } from "@/lib/types";
import showcaseData from "@/data/showcase.json";

const typedShowcaseData = showcaseData as unknown as ShowcaseEntry[];

type Stage = "idle" | "enriching" | "prospecting" | "complete" | "error";

function ProspectingApp() {
  const searchParams = useSearchParams();
  const accessKey = searchParams.get("key");
  const isAuthorized = accessKey === process.env.NEXT_PUBLIC_ACCESS_KEY;

  const [stage, setStage] = useState<Stage>("idle");
  const [company, setCompany] = useState("");
  const [enrichedAccount, setEnrichedAccount] = useState<Account | null>(null);
  const [result, setResult] = useState<ProspectAccountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setCompany("");
    setEnrichedAccount(null);
    setResult(null);
    setError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const handleSubmit = useCallback(async (companyName: string) => {
    setCompany(companyName);
    setStage("enriching");
    setError(null);

    try {
      const res = await fetch("/api/prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const { runId, enrichedAccount: account } = await res.json();
      setEnrichedAccount(account);
      setStage("prospecting");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status?runId=${runId}`);
          if (!statusRes.ok) return;

          const { status, output } = await statusRes.json();

          if (status === "COMPLETED" && output) {
            if (pollRef.current) clearInterval(pollRef.current);
            setResult(output as ProspectAccountResult);
            setStage("complete");
          } else if (status === "FAILED" || status === "CANCELED") {
            if (pollRef.current) clearInterval(pollRef.current);
            throw new Error(`Task ${status.toLowerCase()}`);
          }
        } catch (err) {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(err instanceof Error ? err.message : "Polling failed");
          setStage("error");
        }
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStage("error");
    }
  }, []);

  // ── Access gate — show nothing without the correct key ──
  if (!isAuthorized) {
    return null;
  }

  // ── Main UI ─────────────────────────────────────────────
  return (
    <div className="max-w-[1080px] mx-auto px-6 pt-12 pb-16">
      {/* Header — matches MAP page pattern */}
      <header className="mb-12 animate-[fadeUp_0.6s_ease_both]">
        <p className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-accent mb-2">
          Rula Revenue Intelligence
        </p>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-medium text-text leading-tight mb-2">
          Prospecting Agent
        </h1>
        <p className="text-base text-text-2 max-w-[560px]">
          AI-powered account analysis for Rula&apos;s employer AE sales motion.
          Assesses ICP fit, matches value propositions, and generates
          personalized outreach.
        </p>
      </header>

      {/* ── Try It section ─────────────────────────── */}
      <section className="mb-14 animate-[fadeUp_0.5s_ease_both] [animation-delay:0.15s]">
        <div className="mb-5">
          <h2 className="font-display text-[1.35rem] font-medium text-text mb-1">
            Try It Yourself
          </h2>
          <p className="text-[0.88rem] text-text-3">
            Enter any real company name &mdash; the agent searches the web,
            structures account data, and runs the full analysis. Results
            typically take 1&ndash;2 minutes.
          </p>
        </div>

        {/* Suggestions */}
        <p className="text-[0.72rem] font-semibold tracking-[0.06em] uppercase text-text-3 mb-3">
          Try one of these
        </p>
        <div className="flex gap-3 mb-6">
          <SuggestionChip
            label="University of Texas at Austin"
            onClick={handleSubmit}
            disabled={stage === "enriching" || stage === "prospecting"}
          />
          <SuggestionChip
            label="HCA Healthcare"
            onClick={handleSubmit}
            disabled={stage === "enriching" || stage === "prospecting"}
          />
          <SuggestionChip
            label="Goldman Sachs"
            onClick={handleSubmit}
            disabled={stage === "enriching" || stage === "prospecting"}
          />
        </div>

        {/* Search form */}
        <div className="mb-6">
          <SearchForm
            onSubmit={handleSubmit}
            disabled={stage === "enriching" || stage === "prospecting"}
          />
        </div>

        {/* Enriching state */}
        {stage === "enriching" && (
          <div className="flex items-center gap-3 text-sm text-text-3 mt-3">
            <Spinner />
            <span>Searching the web for {company}...</span>
          </div>
        )}

        {/* Prospecting state */}
        {enrichedAccount && stage === "prospecting" && (
          <div className="mt-5 space-y-4">
            <EnrichmentPreview account={enrichedAccount} />
            <div className="flex items-center gap-3 text-sm text-text-3">
              <Spinner />
              <span>Running prospecting analysis...</span>
            </div>
          </div>
        )}

        {/* Complete */}
        {enrichedAccount && result && stage === "complete" && (
          <div className="mt-5 border-t border-border-light pt-5 space-y-4">
            <EnrichmentPreview account={enrichedAccount} />
            <ProspectResults data={result} />
            <button
              onClick={reset}
              className="text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
            >
              Analyze another company
            </button>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="bg-red-soft text-red rounded-[6px] px-3 py-2 text-[0.82rem] mt-3">
            {error}
            <button
              onClick={reset}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* ── Divider ──────────────────────────────────── */}
      <hr className="border-t border-border my-2 mb-12" />

      {/* ── Showcase section ─────────────────────────── */}
      <ShowcaseSection entries={typedShowcaseData} />

      <p className="text-center text-sm text-text-3 mt-6 mb-14">
        Full results and methodology in the{" "}
        <a
          href="#"
          className="font-semibold text-accent hover:text-accent-dark transition-colors underline underline-offset-2"
        >
          case study document
        </a>
      </p>

      {/* Footer */}
      <p className="text-center text-xs text-text-3">
        All company names, contacts, and account details in the sample
        analyses are fictional. Live analysis uses real web data.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ProspectingApp />
    </Suspense>
  );
}

// ── Shared UI ─────────────────────────────────────────────

function SuggestionChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => onClick(label)}
      disabled={disabled}
      className="bg-surface border border-border rounded-[6px] px-3 py-1.5 text-[0.78rem]
                 text-text-2 hover:border-accent hover:text-accent transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-[13px] h-[13px] border-2 border-border border-t-text-2 rounded-full animate-spin" />
  );
}
