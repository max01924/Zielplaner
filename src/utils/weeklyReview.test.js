import assert from "node:assert/strict";
import test from "node:test";
import { canFillWeeklyReview, pendingWeeklyReviewWeek } from "./weeklyReview.js";

test("weekly review becomes available Sunday at 19:00", () => {
  assert.equal(
    canFillWeeklyReview("2026-08-03", new Date(2026, 7, 9, 18, 59)),
    false
  );
  assert.equal(
    canFillWeeklyReview("2026-08-03", new Date(2026, 7, 9, 19, 0)),
    true
  );
});

test("weekly review notice remains until Monday at 19:00", () => {
  assert.equal(
    pendingWeeklyReviewWeek([], new Date(2026, 7, 9, 19, 0)),
    "2026-08-03"
  );
  assert.equal(
    pendingWeeklyReviewWeek([], new Date(2026, 7, 10, 18, 59)),
    "2026-08-03"
  );
  assert.equal(
    pendingWeeklyReviewWeek([], new Date(2026, 7, 10, 19, 0)),
    null
  );
  assert.equal(
    pendingWeeklyReviewWeek(
      [{ weekKey: "2026-08-03", completedAt: "2026-08-09T18:00:00.000Z" }],
      new Date(2026, 7, 9, 20, 0)
    ),
    null
  );
});
