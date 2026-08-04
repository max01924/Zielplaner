import { ChevronLeft, ChevronRight } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export default function PeriodHeader({
  meta,
  title,
  previousAriaLabel,
  nextAriaLabel,
  progressLabel,
  isCurrent,
  onPrevious,
  onCurrent,
  onNext,
  completedTasks,
  totalTasks,
  timeProgress,
}) {
  return (
    <section className="bg-depth-panel rounded-panel p-5 shadow-panel sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-subtle">{meta}</p>
          <h1 className="mt-2 text-3xl font-black uppercase leading-none text-ink sm:text-4xl">{title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:self-end">
          <button
            type="button"
            onClick={onPrevious}
            className="grid h-11 w-10 place-items-center text-ink transition hover:text-accent"
            aria-label={previousAriaLabel}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={onCurrent}
            className={`inline-flex min-h-11 items-center justify-center rounded-control px-5 text-xs font-black uppercase text-ink transition hover:brightness-110 ${
              isCurrent ? "bg-accent" : "bg-depth-control shadow-inset"
            }`}
          >
            Heute
          </button>
          <button
            type="button"
            onClick={onNext}
            className="grid h-11 w-10 place-items-center text-ink transition hover:text-accent"
            aria-label={nextAriaLabel}
          >
            <ChevronRight className="h-7 w-7" strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2">
        <div className="min-w-0 pr-4 sm:pr-8">
          <p className="text-[10px] font-bold uppercase text-subtle">Aufgaben abgeschlossen</p>
          <p className="mt-1 text-2xl font-black text-ink">
            {completedTasks} <span className="text-sm text-muted">/ {totalTasks}</span>
          </p>
        </div>
        <div className="min-w-0 border-l border-line pl-4 sm:pl-8">
          <p className="text-[10px] font-bold uppercase text-subtle">{progressLabel}</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <p className="text-2xl font-black text-ink">
              {numberFormatter.format(timeProgress.elapsed)}
              <span className="ml-1 text-sm text-muted">/ {timeProgress.total} {timeProgress.unit}</span>
            </p>
            <span className="hidden text-xs font-black text-muted sm:inline">{timeProgress.percent}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas-deep/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
              style={{ width: `${timeProgress.percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
