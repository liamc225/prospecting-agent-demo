"use client";

interface SearchFormProps {
  onSubmit: (company: string) => void;
  disabled: boolean;
}

export function SearchForm({ onSubmit, disabled }: SearchFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const company = formData.get("company") as string;
    if (company.trim()) {
      onSubmit(company.trim());
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-[10px] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label
            htmlFor="company"
            className="block text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-text-3 mb-1"
          >
            Company name
          </label>
          <input
            id="company"
            name="company"
            type="text"
            placeholder="e.g. Intermountain Health"
            disabled={disabled}
            autoComplete="off"
            className="w-full px-3 py-2 border border-border rounded-[6px] text-[0.85rem]
                       text-text bg-surface placeholder:text-text-3
                       focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(153,126,255,0.08)]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-[border-color,box-shadow] duration-150"
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="px-5 py-2 bg-accent text-white text-[0.82rem] font-semibold
                     rounded-[6px] hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150 shrink-0 inline-flex items-center gap-2"
        >
          Analyze
        </button>
      </div>
    </form>
  );
}
