import { Link2 } from "lucide-react";

export default function ParentSelect({ value, onChange, options, label, emptyLabel = "Nicht verknüpft", disabled = false }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-subtle">
        <Link2 className="h-3.5 w-3.5" />
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        className="bg-depth-control min-h-12 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.title ?? option.text}</option>
        ))}
      </select>
    </label>
  );
}
