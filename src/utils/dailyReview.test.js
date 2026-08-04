import assert from "node:assert/strict";
import test from "node:test";
import { canFillDailyReview, pendingDailyReviewDate } from "./dailyReview.js";

test("daily review becomes available at 19:00", () => {
  assert.equal(canFillDailyReview("2026-08-04", new Date(2026, 7, 4, 18, 59)), false);
  assert.equal(canFillDailyReview("2026-08-04", new Date(2026, 7, 4, 19, 0)), true);
  assert.equal(canFillDailyReview("2026-08-03", new Date(2026, 7, 4, 10, 0)), true);
});

test("pending review notice remains for the full 24 hour window", () => {
  assert.equal(pendingDailyReviewDate([], new Date(2026, 7, 4, 18, 59)), "2026-08-03");
  assert.equal(pendingDailyReviewDate([], new Date(2026, 7, 4, 19, 0)), "2026-08-04");
  assert.equal(
    pendingDailyReviewDate(
      [{ dateKey: "2026-08-04", completedAt: "2026-08-04T19:30:00.000Z" }],
      new Date(2026, 7, 5, 18, 59)
    ),
    null
  );
});
