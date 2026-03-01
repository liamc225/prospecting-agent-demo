import type { Account } from "@/lib/types";

interface EnrichmentPreviewProps {
  account: Account;
}

export function EnrichmentPreview({ account }: EnrichmentPreviewProps) {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1 mb-3 pb-3 border-b border-border-light">
        <Fact label="Company" value={account.company} />
        <Fact label="Industry" value={account.industry} />
        <Fact
          label="Employees"
          value={`${account.us_employees.toLocaleString()} US`}
        />
        <Fact label="Health Plan" value={account.health_plan} />
        <Fact
          label="Contact"
          value={
            account.contact_name
              ? `${account.contact_name}, ${account.contact_title}`
              : "Not identified"
          }
        />
      </div>
      {account.notes && (
        <p className="text-[0.8rem] text-text-2 leading-relaxed">
          {account.notes}
        </p>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[0.8rem]">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-text-3 w-[90px] shrink-0 pt-px">
        {label}
      </span>
      <span className="text-text-2">{value}</span>
    </div>
  );
}
