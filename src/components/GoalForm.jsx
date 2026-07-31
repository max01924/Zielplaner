import { Plus } from "lucide-react";
import { useState } from "react";

export default function GoalForm({ label, placeholder, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function submit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    onCreate({
      title: trimmedTitle,
      description: description.trim(),
    });
    setTitle("");
    setDescription("");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="mb-3 text-sm font-bold text-slate-950 dark:text-white">{label}</p>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Beschreibung optional"
          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          Ziel erstellen
        </button>
      </div>
    </form>
  );
}
