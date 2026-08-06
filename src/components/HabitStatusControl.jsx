import { CalendarRange, Check, ChevronDown, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { addDays, toDateKey } from "../utils/date.js";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDateKey(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day, 12));
}

export default function HabitStatusControl({ habit, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(habit.status ?? "active");
  const [pauseStart, setPauseStart] = useState(habit.pauseStart ?? toDateKey(new Date()));
  const [pauseEnd, setPauseEnd] = useState(habit.pauseEnd ?? toDateKey(addDays(new Date(), 6)));
  const isPaused = (habit.status ?? "active") === "paused";
  const validPause = status === "active" || (pauseStart && pauseEnd && pauseStart <= pauseEnd);

  useEffect(() => {
    setStatus(habit.status ?? "active");
    setPauseStart(habit.pauseStart ?? toDateKey(new Date()));
    setPauseEnd(habit.pauseEnd ?? toDateKey(addDays(new Date(), 6)));
  }, [habit.status, habit.pauseStart, habit.pauseEnd]);

  async function save() {
    if (!validPause) return;
    await onUpdate(habit.id, status === "active"
      ? { status: "active", pauseStart: null, pauseEnd: null }
      : { status: "paused", pauseStart, pauseEnd });
    setIsOpen(false);
  }

  function close() {
    setStatus(habit.status ?? "active");
    setPauseStart(habit.pauseStart ?? toDateKey(new Date()));
    setPauseEnd(habit.pauseEnd ?? toDateKey(addDays(new Date(), 6)));
    setIsOpen(false);
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="bg-depth-control inline-flex min-h-10 items-center gap-2 rounded-control px-3.5 text-xs font-black uppercase text-ink shadow-inset transition hover:brightness-125"
        aria-expanded={isOpen}
      >
        {isPaused ? <Pause className="h-4 w-4 text-accent" /> : <Play className="h-4 w-4 fill-accent text-accent" />}
        {isPaused ? "Pausiert" : "Aktiv"}
        <ChevronDown className={`h-4 w-4 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isPaused && !isOpen ? (
        <p className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase text-subtle">
          <CalendarRange className="h-3.5 w-3.5 text-accent" />
          {formatDateKey(habit.pauseStart)} bis {formatDateKey(habit.pauseEnd)}
        </p>
      ) : null}

      {isOpen ? (
        <div className="bg-depth-inset mt-3 rounded-2xl p-4 shadow-inset">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("active")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-3 text-xs font-black uppercase transition ${
                status === "active" ? "bg-accent text-accent-contrast" : "bg-depth-control text-muted hover:text-ink"
              }`}
            >
              <Play className="h-4 w-4" />
              Aktiv
            </button>
            <button
              type="button"
              onClick={() => setStatus("paused")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-3 text-xs font-black uppercase transition ${
                status === "paused" ? "bg-accent text-accent-contrast" : "bg-depth-control text-muted hover:text-ink"
              }`}
            >
              <Pause className="h-4 w-4" />
              Pausiert
            </button>
          </div>

          {status === "paused" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Startdatum</span>
                <input
                  type="date"
                  value={pauseStart}
                  onChange={(event) => setPauseStart(event.target.value)}
                  className="bg-depth-control min-h-11 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Enddatum</span>
                <input
                  type="date"
                  min={pauseStart}
                  value={pauseEnd}
                  onChange={(event) => setPauseEnd(event.target.value)}
                  className="bg-depth-control min-h-11 w-full rounded-control px-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
            </div>
          ) : null}

          {!validPause ? (
            <p className="mt-3 text-xs font-semibold text-accent">Das Enddatum darf nicht vor dem Startdatum liegen.</p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface hover:text-ink"
              aria-label="Statusänderung abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!validPause}
              className="inline-flex min-h-10 items-center gap-2 rounded-control bg-accent px-4 text-xs font-black uppercase text-accent-contrast transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Übernehmen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
