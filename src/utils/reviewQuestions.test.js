import assert from "node:assert/strict";
import test from "node:test";
import { reviewForPeriod } from "./reviewQuestions.js";

test("daily review questions continue forward with empty answers", () => {
  const questions = [
    { id: "positive", kind: "positive", question: "Was lief gut?", answer: "Fokus" },
    { id: "energy", kind: "custom", question: "Wie war die Energie?", answer: "Hoch" },
  ];
  const inherited = reviewForPeriod(
    [{ dateKey: "2026-08-05", questions, completedAt: "2026-08-05T19:30:00.000Z" }],
    "2026-08-06",
    "dateKey"
  );

  assert.deepEqual(inherited.questions.map((item) => item.question), [
    "Was lief gut?",
    "Wie war die Energie?",
  ]);
  assert.deepEqual(inherited.questions.map((item) => item.answer), ["", ""]);
  assert.equal(inherited.completedAt, null);
});

test("review questions stay inside their period scope and exact reviews win", () => {
  const weeklyReviews = [{
    weekKey: "2026-08-03",
    questions: [{ id: "weekly", kind: "custom", question: "Wochenfrage", answer: "Antwort" }],
  }];
  const inheritedWeek = reviewForPeriod(weeklyReviews, "2026-08-10", "weekKey");
  assert.equal(inheritedWeek.questions[0].question, "Wochenfrage");

  const exact = { weekKey: "2026-08-10", questions: [], completedAt: null };
  assert.equal(reviewForPeriod([...weeklyReviews, exact], "2026-08-10", "weekKey"), exact);
  assert.equal(reviewForPeriod(weeklyReviews, "2026-08-10", "dateKey"), null);
});

test("empty weekly plan placeholders do not block inherited questions", () => {
  const reviews = [
    {
      weekKey: "2026-08-03",
      hasReview: true,
      questions: [{ id: "focus", kind: "custom", question: "Was war mein Fokus?", answer: "Planung" }],
    },
    {
      weekKey: "2026-08-10",
      hasReview: false,
      questions: [
        { id: "positive", kind: "positive", question: "Was war positiv?", answer: "" },
        { id: "improvement", kind: "improvement", question: "Was muss verbessert werden?", answer: "" },
      ],
    },
  ];

  const inherited = reviewForPeriod(reviews, "2026-08-10", "weekKey");
  assert.equal(inherited.questions.length, 1);
  assert.equal(inherited.questions[0].question, "Was war mein Fokus?");
  assert.equal(inherited.questions[0].answer, "");
});
