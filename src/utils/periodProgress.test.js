import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentPeriod, periodTimeProgress } from "./periodProgress.js";

const now = new Date(2026, 7, 4, 12, 30);

test("period progress uses hours for day, week and month", () => {
  assert.deepEqual(
    periodTimeProgress("day", new Date(2026, 7, 4), now),
    { elapsed: 12.5, total: 24, unit: "Stunden", percent: 52 }
  );
  assert.deepEqual(
    periodTimeProgress("week", new Date(2026, 7, 3), now),
    { elapsed: 36.5, total: 168, unit: "Stunden", percent: 22 }
  );
  assert.deepEqual(
    periodTimeProgress("month", new Date(2026, 7, 1), now),
    { elapsed: 84.5, total: 744, unit: "Stunden", percent: 11 }
  );
});

test("year progress uses days and current period comparison", () => {
  assert.deepEqual(
    periodTimeProgress("year", new Date(2026, 0, 1), now),
    { elapsed: 216, total: 365, unit: "Tage", percent: 59 }
  );
  assert.equal(isCurrentPeriod("week", new Date(2026, 7, 9), now), true);
  assert.equal(isCurrentPeriod("month", new Date(2026, 6, 1), now), false);
});
