import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import ParentSelect from "./ParentSelect.jsx";

export default function GoalForm({
  label,
  placeholder,
  periodKey,
  parentOptions = [],
  parentPrefill = null,
  parentLabel = "Übergeordnetes Jahresziel",
  quickCapture = false,
  onCreate,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentGoalId, setParentGoalId] = useState(parentPrefill);

  useEffect(() => setParentGoalId(parentPrefill), [parentPrefill]);

  function submit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    onCreate({
      title: trimmedTitle,
      description: description.trim(),
      periodKey,
      parentGoalId,
    });
    setTitle("");
    setDescription("");
    setParentGoalId(null);
  }

  if (quickCapture) {
    return (
      <form onSubmit={submit} className="bg-depth-panel rounded-panel p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-subtle">Schnellerfassung</p>
            <p className="text-base font-black uppercase text-ink">{label}</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.8fr)_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Aufgabe</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={placeholder}
              className="bg-depth-control min-h-12 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
            />
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Beschreibung</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              className="bg-depth-control min-h-12 w-full rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
            />
          </label>
          <ParentSelect
            value={parentGoalId}
            onChange={setParentGoalId}
            options={parentOptions}
            label={parentLabel}
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Hinzufügen
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="bg-depth-panel rounded-panel p-5 shadow-card sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-end">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase text-subtle">Neuer Fokus</p>
          <p className="text-base font-black uppercase text-ink">{label}</p>
        </div>
        <div className={`grid gap-3 ${parentOptions.length ? "lg:grid-cols-2" : "lg:grid-cols-[1fr_1fr_auto]"}`}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={placeholder}
            className="bg-depth-control min-h-12 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beschreibung optional"
            className="bg-depth-control min-h-12 rounded-control px-4 text-sm text-ink shadow-inset outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-accent"
          />
          {parentOptions.length ? (
            <ParentSelect
              value={parentGoalId}
              onChange={setParentGoalId}
              options={parentOptions}
              label={parentLabel}
            />
          ) : null}
          <button
            type="submit"
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110 ${parentOptions.length ? "lg:col-span-full lg:justify-self-end" : ""}`}
          >
            <Plus className="h-4 w-4" />
            Ziel erstellen
          </button>
        </div>
      </div>
    </form>
  );
}
