import { CheckCircle2, LockKeyhole, MessageSquareText, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

const defaultQuestions = [
  { id: "positive", kind: "positive", question: "Was war positiv?", answer: "" },
  { id: "improvement", kind: "improvement", question: "Was muss verbessert werden?", answer: "" },
];

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
  const [questions, setQuestions] = useState(review?.questions ?? defaultQuestions);
  const [newQuestion, setNewQuestion] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const isComplete = Boolean(review?.completedAt);
  const canComplete = questions.every((item) => item.question.trim() && item.answer.trim());

  useEffect(() => {
    setQuestions(review?.questions ?? defaultQuestions);
    setNewQuestion("");
    setEditingQuestionId(null);
    setQuestionDraft("");
  }, [review, periodLabel]);

  function addQuestion(event) {
    event.preventDefault();
    const question = newQuestion.trim();
    if (!question) return;
    setQuestions((current) => [
      ...current,
      { id: createQuestionId(), kind: "custom", question, answer: "" },
    ]);
    setNewQuestion("");
  }

  function updateAnswer(questionId, answer) {
    setQuestions((current) => current.map((item) => (
      item.id === questionId ? { ...item, answer } : item
    )));
  }

  function startQuestionEdit(item) {
    setEditingQuestionId(item.id);
    setQuestionDraft(item.question);
  }

  function cancelQuestionEdit() {
    setEditingQuestionId(null);
    setQuestionDraft("");
  }

  function saveQuestionEdit(questionId) {
    const question = questionDraft.trim();
    if (!question) return;
    setQuestions((current) => current.map((item) => (
      item.id === questionId ? { ...item, question } : item
    )));
    cancelQuestionEdit();
  }

  function save(complete) {
    const normalizedQuestions = questions.map((item) => ({
      ...item,
      question: item.question.trim(),
      answer: item.answer.trim(),
    }));
    onSave({
      positive: normalizedQuestions.find((item) => item.kind === "positive")?.answer ?? "",
      improvement: normalizedQuestions.find((item) => item.kind === "improvement")?.answer ?? "",
      customQuestions: normalizedQuestions.filter((item) => item.kind === "custom"),
      questions: normalizedQuestions,
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
        ? (isComplete ? "bg-accent text-accent-contrast" : "bg-depth-control text-muted shadow-inset")
        : (isComplete ? "bg-accent text-accent-contrast" : "bg-depth-inset text-muted shadow-inset")
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
      {questions.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {questions.map((item) => {
            const isEditingQuestion = editingQuestionId === item.id;
            return (
              <div key={item.id} className="min-w-0">
                <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
                  {isEditingQuestion ? (
                    <input
                      value={questionDraft}
                      onChange={(event) => setQuestionDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveQuestionEdit(item.id);
                        if (event.key === "Escape") cancelQuestionEdit();
                      }}
                      className="bg-depth-control min-h-9 min-w-0 flex-1 rounded-lg px-3 text-xs font-bold text-ink shadow-inset outline-none focus:ring-2 focus:ring-accent"
                      aria-label="Review-Frage bearbeiten"
                      autoFocus
                    />
                  ) : (
                    <span className="min-w-0 text-[10px] font-bold uppercase text-subtle">
                      {item.question}
                    </span>
                  )}
                  <span className="flex shrink-0 items-center gap-1">
                    {isEditingQuestion ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveQuestionEdit(item.id)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                          aria-label="Frage speichern"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelQuestionEdit}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                          aria-label="Bearbeitung abbrechen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startQuestionEdit(item)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                          aria-label={`Frage „${item.question}“ bearbeiten`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuestions((current) => current.filter((question) => question.id !== item.id))}
                          className="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface hover:text-ink"
                          aria-label={`Frage „${item.question}“ löschen`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <textarea
                  value={item.answer}
                  onChange={(event) => updateAnswer(item.id, event.target.value)}
                  rows="4"
                  className="bg-depth-control w-full resize-y rounded-control px-4 py-3 text-sm leading-relaxed text-ink shadow-inset outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flat-dashed-frame flex min-h-28 items-center justify-center rounded-control px-6 text-sm text-muted">
          Noch keine Review-Fragen festgelegt.
        </div>
      )}

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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast shadow-inset transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
