import assert from "node:assert/strict";
import test from "node:test";
import { calculateStreak } from "./streaks.js";

function dateRange(year, month, days) {
  return Array.from({ length: days }, (_, index) => (
    `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
  ));
}

test("daily streak counts completed days before today", () => {
  const result = calculateStreak({
    frequencyPeriod: "day",
    targetCount: 1,
    createdAt: "2026-08-01T12:00:00.000Z",
    completions: ["2026-08-02", "2026-08-03", "2026-08-04"],
  }, new Date(2026, 7, 5, 12));

  assert.equal(result.streak, 3);
  assert.equal(result.currentPeriodCount, 0);
  assert.equal(result.currentPeriodTarget, 1);
  assert.equal(result.frequencyPeriod, "day");
});

test("weekly streak keeps ISO week behavior", () => {
  const result = calculateStreak({
    frequencyPeriod: "week",
    targetCount: 2,
    createdAt: "2026-07-20T12:00:00.000Z",
    completions: ["2026-07-27", "2026-07-29", "2026-08-03", "2026-08-05", "2026-08-10"],
  }, new Date(2026, 7, 12, 12));

  assert.equal(result.streak, 2);
  assert.equal(result.currentPeriodCount, 1);
  assert.equal(result.currentPeriodTarget, 2);
});

test("monthly streak adapts a target of 31 to shorter months", () => {
  const result = calculateStreak({
    frequencyPeriod: "month",
    targetCount: 31,
    createdAt: "2026-01-01T12:00:00.000Z",
    completions: [...dateRange(2026, 2, 28), "2026-03-01", "2026-03-02"],
  }, new Date(2026, 2, 15, 12));

  assert.equal(result.streak, 1);
  assert.equal(result.currentPeriodCount, 2);
  assert.equal(result.currentPeriodTarget, 31);
  assert.equal(result.frequencyPeriod, "month");

  const february = calculateStreak({
    frequencyPeriod: "month",
    targetCount: 31,
    createdAt: "2026-01-01T12:00:00.000Z",
    completions: [],
  }, new Date(2026, 1, 15, 12));
  assert.equal(february.currentPeriodTarget, 28);
});
