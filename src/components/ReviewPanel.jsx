import { CheckCircle2, LockKeyhole, MessageSquareText, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

function createQuestionId() {
  return globalThis.crypto?.randomUUID?.() ?? `question-${Date.now()}`;
}

export default function ReviewPanel({
  id,
  eyebrow,
  title,
  periodLabel,
  review,
  canEdit,
  lockedText,
  onSave,
  flat = false,
  allowReopen = false,
}) {
  const [positive, setPositive] = useState(review?.positive ?? "");
  const [improvement, setImprovement] = useState(review?.improvement ?? "");
  const [customQuestions, setCustomQuestions] = useState(review?.customQuestions ?? []);
  const [newQuestion, setNewQuestion] = useState("");
  const isComplete = Boolean(review?.completedAt);
  const canComplete = positive.trim()
    && improvement.trim()
    && customQuestions.every((item) => item.question.trim() && item.answer.trim());

  useEffect(() => {
    setPositive(review?.positive ?? "");
    setImprovement(review?.improvement ?? "");
    setCustomQuestions(review?.customQuestions ?? []);
    setNewQuestion("");
  }, [review, periodLabel]);

  function addQuestion(event) {
    event.preventDefault();
    const question = newQuestion.trim();
    if (!question) return;
    setCustomQuestions((current) => [
      ...current,
      { id: createQuestionId(), question, answer: "" },
    ]);
    setNewQuestion("");
  }

  function updateAnswer(questionId, answer) {
    setCustomQuestions((current) => current.map((item) => (
      item.id === questionId ? { ...item, answer } : item
    )));
  }

  function save(complete) {
    onSave({
      positive: positive.trim(),
      improvement: improvement.trim(),
      customQuestions: customQuestions.map((item) => ({
        ...item,
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
      complete,
    });
  }

  const header = (
    <div className={`flex flex-wrap justify-between gap-4 ${flat ? "mb-3 items-end pb-2" : "items-start"}`}>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase text-subtle">{eyebrow}</p>
        <h2 className="text-2xl font-black uppercase text-ink">{title}</h2>
        {periodLabel ? <p className="mt-1 text-xs font-semibold text-muted">{periodLabel}</p> : null}
      </div>
      <span className={`inline-flex items-center gap-2 rounded-control px-3 py-2 text-xs font-bold ${flat
        ? (isComplete ? "bg-accent text-ink" : "bg-depth-control text-muted shadow-inset")
        : (isComplete ? "bg-accent text-ink" : "bg-depth-inset text-muted shadow-inset")
      }`}>
        {isComplete
          ? <CheckCircle2 className="h-4 w-4" />
          : <MessageSquareText className="h-4 w-4 text-accent" />}
        {isComplete ? "Abgeschlossen" : "Offen"}
      </span>
    </div>
  );

  const content = !canEdit ? (
    <div className={`flex items-center gap-3 text-sm text-muted ${flat ? "justify-center" : "mt-7"}`}>
      <LockKeyhole className="h-5 w-5 text-subtle" />
      {lockedText}
    </div>
  ) : (
    <div className={`${flat ? "" : "mt-7"} space-y-6`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <label>
          <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Was war positiv?</span>
          <textarea
            value={positive}
            onChange={(event) => setPositive(event.target.value)}
            rows="4"
            className="bg-depth-control w-full resize-y rounded-control px-4 py-3 text-sm leading-relaxed text-ink shadow-inset outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent"
          />
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-bold uppercase text-subtle">Was muss verbessert werden?</span>
          <textarea
            value={improvement}
            onChange={(event) => setImprovement(event.target.value)}
            rows="4"
            className="bg-depth-control w-full resize-y rounded-control px-4 py-3 text-sm leading-relaxed text-ink shadow-inset outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>

      {customQuestions.length ? (
        <div className="space-y-3">
          {customQuestions.map((item) => (
            <div key={item.id} className="bg-depth-inset rounded-2xl p-4 shadow-inset">
              <div className="flex items-start justify-between gap-3">
                <label className="min-w-0 flex-1">
                  <span className="mb-2 block text-xs font-bold text-ink">{item.question}</span>
                  <textarea
                    value={item.answer}
                    onChange={(event) => updateAnswer(item.id, event.target.value)}
                    rows="2"
                    className="bg-depth-control w-full resize-y rounded-control px-4 py-3 text-sm text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setCustomQuestions((current) => current.filter((question) => question.id !== item.id))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink"
                  aria-label="Eigene Frage entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={addQuestion} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={newQuestion}
          onChange={(event) => setNewQuestion(event.target.value)}
          placeholder="Eigene Review-Frage"
          className="bg-depth-control min-h-11 flex-1 rounded-control px-4 text-sm text-ink shadow-inset outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent"
        />
        <button type="submit" disabled={!newQuestion.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-depth-control px-4 text-xs font-black uppercase text-ink shadow-inset transition hover:brightness-125 disabled:opacity-40">
          <Plus className="h-4 w-4 text-accent" />
          Frage hinzufügen
        </button>
      </form>

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        {isComplete && allowReopen ? (
          <button type="button" onClick={() => save(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-depth-control px-5 text-sm font-bold text-ink shadow-inset transition hover:brightness-125">
            <RotateCcw className="h-4 w-4 text-accent" />
            Wieder öffnen
          </button>
        ) : null}
        {!isComplete ? (
          <button type="button" onClick={() => save(false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-depth-control px-5 text-sm font-bold text-ink shadow-inset transition hover:brightness-125">
            <Save className="h-4 w-4" />
            Entwurf speichern
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save(true)}
          disabled={!canComplete}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-ink shadow-inset transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isComplete ? "Review aktualisieren" : "Review abschließen"}
        </button>
      </div>
    </div>
  );

  if (flat) {
    return (
      <section id={id} className="scroll-mt-6">
        {header}
        <div className={`rounded-panel ${isComplete
          ? "p-7 sm:p-8"
          : (canEdit ? "flat-dashed-frame p-7 sm:p-8" : "flat-dashed-frame flex min-h-44 items-center justify-center p-10 sm:min-h-48 sm:p-12")
        }`}>
          {content}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`scroll-mt-6 rounded-panel p-7 sm:p-8 ${isComplete ? "bg-depth-panel shadow-card" : "empty-depth-frame"}`}
    >
      {header}
      {content}
    </section>
  );
}
