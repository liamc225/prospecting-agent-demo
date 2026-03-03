import type { ProspectAccountResult, IcpFit, ValueProp } from "@/lib/types";

interface ProspectResultsProps {
  data: ProspectAccountResult;
}

const ICP_BADGE: Record<IcpFit, { bg: string; text: string; label: string }> = {
  strong_fit: { bg: "bg-green-soft", text: "text-green-muted", label: "Strong Fit" },
  moderate_fit: { bg: "bg-amber-soft", text: "text-amber-muted", label: "Moderate Fit" },
  weak_fit: { bg: "bg-amber-soft", text: "text-amber-muted", label: "Weak Fit" },
  disqualify: { bg: "bg-red-soft", text: "text-red-muted", label: "Disqualified" },
};

const VP_LABELS: Record<ValueProp, string> = {
  total_cost_of_care_reduction: "Total Cost of Care Reduction",
  eap_upgrade: "EAP Upgrade",
  workforce_productivity: "Workforce Productivity",
  employee_access_and_experience: "Employee Access & Experience",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  pain_led: "Pain-Led",
  insight_led: "Insight-Led",
};

function scoreColor(v: number): string {
  if (v >= 0.8) return "green";
  if (v >= 0.5) return "amber";
  return "red";
}

export function ProspectResults({ data }: ProspectResultsProps) {
  const { result, quality } = data;
  const badge = ICP_BADGE[result.icp_fit];

  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 shadow-[var(--shadow-card)] flex flex-col gap-5">
      {/* ── ICP + Confidence ───────────────────────── */}
      <div>
        <span
          className={`inline-block text-[0.68rem] font-bold tracking-[0.08em] uppercase px-3 py-1 rounded-[5px] mb-3 ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>

        {/* Score bars */}
        <div className="mb-4">
          <ScoreBar
            label="Confidence"
            value={result.confidence_score}
          />
          <ScoreBar
            label="Quality"
            value={quality.quality_score}
          />
        </div>

        <p className="text-[0.8rem] text-text-2 leading-relaxed">
          {result.icp_reasoning}
        </p>
      </div>

      {/* ── Value Propositions ─────────────────────── */}
      <div className="border-t border-border-light pt-5">
        <SectionLabel>Value Propositions</SectionLabel>
        <div className="flex flex-col gap-3">
          {result.matched_value_props.map((vp) => (
            <div key={vp.value_prop}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.82rem] font-semibold text-text">
                  {VP_LABELS[vp.value_prop]}
                </span>
                <ScoreInline value={vp.relevance_score} />
              </div>
              <p className="text-[0.78rem] text-text-2 leading-relaxed">
                {vp.reasoning}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Email ─────────────────────────────────── */}
      {result.email_body && (
        <div className="border-t border-border-light pt-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel className="mb-0">Outreach Email</SectionLabel>
            <div className="flex items-center gap-2">
              {result.flags.some((f) => f.toLowerCase().includes("no contact")) && (
                <span className="text-[0.62rem] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded bg-amber-soft text-amber-muted">
                  Draft — Contact Needed
                </span>
              )}
              <span className="text-[0.62rem] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded bg-accent-soft text-accent-muted">
                {FRAMEWORK_LABELS[result.email_framework] ?? result.email_framework}
              </span>
            </div>
          </div>
          <div className="text-[0.82rem] font-semibold text-text mb-2">
            {result.email_subject}
          </div>
          <div className="text-[0.78rem] text-text-2 leading-relaxed whitespace-pre-wrap bg-surface-raised rounded-[6px] p-4 border-l-2 border-border">
            {result.email_body}
          </div>
        </div>
      )}

      {/* ── Discovery Questions ───────────────────── */}
      <Toggle
        label="Discovery Questions"
        count={`${result.discovery_questions.length}`}
      >
        <div className="flex flex-col gap-3">
          {result.discovery_questions.map((dq, i) => (
            <div key={i}>
              <p className="text-[0.8rem] font-medium text-text mb-0.5">
                {dq.question}
              </p>
              <p className="text-[0.72rem] text-text-3 leading-relaxed">
                {dq.rationale}
              </p>
            </div>
          ))}
        </div>
      </Toggle>

      {/* ── Flags ─────────────────────────────────── */}
      {result.flags.length > 0 && (
        <Toggle label="Flags" count={`${result.flags.length}`}>
          <ul className="flex flex-col gap-1">
            {result.flags.map((flag, i) => (
              <li
                key={i}
                className="text-[0.78rem] text-text-2 leading-relaxed relative pl-3"
              >
                <span className="absolute left-0 top-[0.55em] w-1 h-1 rounded-full bg-amber" />
                {flag}
              </li>
            ))}
          </ul>
        </Toggle>
      )}

      {/* ── Sparse data / Benefits intel ──────────── */}
      {(result.sparse_data_handling || result.benefits_intelligence) && (
        <Toggle label="Data Notes">
          <div className="flex flex-col gap-3">
            {result.sparse_data_handling && (
              <div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.06em] text-text-3 mb-1">
                  Sparse Data Handling
                </div>
                <p className="text-[0.78rem] text-text-2 leading-relaxed bg-surface-raised rounded-[6px] p-3">
                  {result.sparse_data_handling}
                </p>
              </div>
            )}
            {result.benefits_intelligence && (
              <div>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.06em] text-text-3 mb-1">
                  Benefits Intelligence
                </div>
                <p className="text-[0.78rem] text-text-2 leading-relaxed bg-surface-raised rounded-[6px] p-3">
                  {result.benefits_intelligence}
                </p>
              </div>
            )}
          </div>
        </Toggle>
      )}

      {/* ── Quality Checks ────────────────────────── */}
      <Toggle
        label="Quality Checks"
        count={`${Object.values(quality.checks).filter(Boolean).length}/${Object.keys(quality.checks).length}`}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(quality.checks).map(([name, passed]) => (
            <div key={name} className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${passed ? "bg-green" : "bg-red"}`}
              />
              <span className="text-[0.75rem] text-text-2">
                {formatCheckName(name)}
              </span>
            </div>
          ))}
        </div>
      </Toggle>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function SectionLabel({
  children,
  className = "mb-3",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h4
      className={`text-[0.65rem] font-bold uppercase tracking-[0.06em] text-text-3 ${className}`}
    >
      {children}
    </h4>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2.5 mb-1.5">
      <span className="text-[0.7rem] font-medium text-text-3 w-[100px] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1 bg-border-light rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm bg-${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={`text-[0.72rem] font-semibold w-9 text-right text-${color}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ScoreInline({ value }: { value: number }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1 bg-border-light rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm bg-${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={`text-[0.72rem] font-semibold text-${color}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function Toggle({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border-t border-border-light">
      <summary className="cursor-pointer list-none py-1.5 flex items-center gap-1.5 text-[0.75rem] font-semibold text-text-3 hover:text-text-2 transition-colors select-none [&::-webkit-details-marker]:hidden group">
        <span className="w-0 h-0 border-l-[4px] border-l-text-3 border-y-[3px] border-y-transparent shrink-0 transition-transform group-open:rotate-90" />
        {label}
        {count && (
          <span className="font-normal text-text-3">{count}</span>
        )}
      </summary>
      <div className="pb-2 pt-2 animate-[fadeIn_0.2s_ease]">{children}</div>
    </details>
  );
}

function formatCheckName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
