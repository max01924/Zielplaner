import assert from "node:assert/strict";
import test from "node:test";
import { dateKeyFromIsoWeek, toIsoWeekInputValue } from "./date.js";

test("converts ISO week inputs to Monday date keys", () => {
  assert.equal(dateKeyFromIsoWeek("2026-W32"), "2026-08-03");
  assert.equal(toIsoWeekInputValue("2026-08-03"), "2026-W32");
});

test("handles ISO weeks that cross calendar years", () => {
  assert.equal(dateKeyFromIsoWeek("2026-W01"), "2025-12-29");
  assert.equal(toIsoWeekInputValue("2025-12-29"), "2026-W01");
  assert.equal(dateKeyFromIsoWeek("2025-W53"), null);
  assert.equal(dateKeyFromIsoWeek(""), null);
});
