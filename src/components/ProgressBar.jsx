import { progressTone } from "../utils/progress.js";

export default function ProgressBar({ label, value, meta }) {
  const tone = progressTone(value);

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.soft} p-3 dark:border-slate-700 dark:bg-slate-900`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          {meta ? <p className="text-xs text-slate-500 dark:text-slate-400">{meta}</p> : null}
        </div>
        <span className={`shrink-0 text-sm font-bold ${tone.text}`}>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${tone.bar} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
