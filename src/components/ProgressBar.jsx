export default function ProgressBar({ label, value, meta, compact = false }) {
  return (
    <div className={compact ? "py-4" : "py-2"}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink">{label}</p>
          {meta ? (
            <p className={`mt-1 text-xs leading-relaxed ${compact ? "text-ink" : "text-muted"}`}>
              {meta}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-lg font-black text-ink">{value}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-canvas-deep/80 shadow-inset">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
