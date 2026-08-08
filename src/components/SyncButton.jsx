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
    <div className="group relative flex shrink-0 items-center">
      <button
        type="button"
        onClick={runSync}
        disabled={isSyncing}
        className="bg-depth-control inline-flex h-9 w-9 items-center justify-center gap-2 rounded-xl text-sm font-bold text-ink shadow-inset transition hover:brightness-125 disabled:opacity-60 sm:h-10 sm:w-10 sm:rounded-control xl:min-h-11 xl:w-auto xl:px-4"
        aria-label={isSyncing ? "Synchronisierung läuft" : "Synchronisieren"}
        title={isSyncing ? "Sync läuft" : "Synchronisieren"}
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="hidden xl:inline">{isSyncing ? "Sync läuft" : "Sync"}</span>
      </button>

      {lastSyncedAt ? (
        <p className="liquid-glass-popover pointer-events-none absolute right-0 top-[calc(100%+0.75rem)] hidden w-max max-w-[220px] rounded-xl px-3 py-2 text-xs font-semibold text-muted group-hover:block group-focus-within:block">
          Zuletzt synchronisiert: {timeFormatter.format(new Date(lastSyncedAt))}
        </p>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(260px,calc(100vw-2rem))] rounded-control bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast shadow-card" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
