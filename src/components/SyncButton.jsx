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
    <div className="flex flex-col items-start gap-1.5 md:items-end md:text-right">
      <button
        type="button"
        onClick={runSync}
        disabled={isSyncing}
        className="bg-depth-control inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-bold text-ink shadow-inset transition hover:brightness-125 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        {isSyncing ? "Sync läuft" : "Sync"}
      </button>

      {lastSyncedAt ? (
        <p className="max-w-[220px] text-xs font-semibold text-muted">
          Zuletzt synchronisiert: {timeFormatter.format(new Date(lastSyncedAt))}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-[260px] rounded-control bg-accent px-2 py-1 text-xs font-semibold text-ink shadow-inset">
          {error}
        </p>
      ) : null}
    </div>
  );
}
