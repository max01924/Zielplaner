import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "../api.js";

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export default function SyncButton({ onSynced }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [error, setError] = useState("");

  async function runSync() {
    setIsSyncing(true);
    setError("");

    try {
      const result = await api.sync();
      await onSynced();
      setLastSyncedAt(result.timestamp);
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 text-left">
      <button
        type="button"
        onClick={runSync}
        disabled={isSyncing}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Sync läuft" : "Sync"}
      </button>

      {lastSyncedAt ? (
        <p className="max-w-[220px] text-xs font-semibold text-slate-500 dark:text-slate-400">
          Zuletzt synchronisiert: {timeFormatter.format(new Date(lastSyncedAt))}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-[260px] text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
