"use client";

import { useState } from "react";
import { EnrichmentPreview } from "./enrichment-preview";
import { ProspectResults } from "./prospect-results";
import type { Account, ProspectAccountResult } from "@/lib/types";

export interface ShowcaseEntry {
  account: Account;
  result: ProspectAccountResult["result"];
  quality: ProspectAccountResult["quality"];
}

interface ShowcaseSectionProps {
  entries: ShowcaseEntry[];
}

export function ShowcaseSection({ entries }: ShowcaseSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = entries[activeIndex];

  return (
    <section className="mb-14">
      <div className="mb-5 animate-[fadeUp_0.6s_ease_both] [animation-delay:0.05s]">
        <h2 className="font-display text-[1.35rem] font-medium text-text mb-1">
          Sample Analyses
        </h2>
        <p className="text-[0.88rem] text-text-3">
          Three fictional accounts across different ICP segments &mdash; click
          each to compare how the agent adapts its analysis
        </p>
      </div>

      {/* Account selector cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {entries.map((entry, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={entry.account.id}
              onClick={() => setActiveIndex(i)}
              className={`bg-surface border rounded-[10px] p-4 text-left shadow-[var(--shadow-card)] cursor-pointer
                transition-all animate-[fadeUp_0.5s_ease_both]
                ${isActive ? "border-accent border-t-[3px] border-t-accent" : "border-border border-t-[3px] border-t-border hover:border-text-3"}
              `}
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <h3 className="font-display text-[1.05rem] font-medium text-text leading-snug mb-0.5">
                {entry.account.company}
              </h3>
              <p className="text-[0.72rem] text-text-3">
                {entry.account.industry} &middot;{" "}
                {entry.account.us_employees.toLocaleString()} employees
              </p>
            </button>
          );
        })}
      </div>

      {/* Active account results */}
      <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
        <EnrichmentPreview account={active.account} />
        <ProspectResults
          data={{ result: active.result, quality: active.quality }}
        />
      </div>
    </section>
  );
}
