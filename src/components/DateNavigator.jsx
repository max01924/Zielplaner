import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, formatFullDate, formatWeekday } from "../utils/date.js";

export default function DateNavigator({ selectedDate, onChange }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => onChange(addDays(selectedDate, -1))}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Vorheriger Tag"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sm:hidden">Vorheriger Tag</span>
      </button>

      <div className="flex min-w-0 items-center gap-3 text-center sm:text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold capitalize text-slate-500 dark:text-slate-400">{formatWeekday(selectedDate)}</p>
          <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">{formatFullDate(selectedDate)}</h2>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(addDays(selectedDate, 1))}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Nächster Tag"
      >
        <span className="sm:hidden">Nächster Tag</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
