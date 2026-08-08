import assert from "node:assert/strict";
import test from "node:test";
import { dateKeyFromIsoWeek, formatDateKey, isoWeekKeyFromDateKey, toIsoWeekInputValue } from "./date.js";

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

test("derives stable ISO week keys from daily date keys", () => {
  assert.equal(isoWeekKeyFromDateKey("2027-01-10"), "2027-01-04");
  assert.equal(isoWeekKeyFromDateKey("2027-01-11"), "2027-01-11");
});

test("formats task origin dates consistently", () => {
  assert.equal(formatDateKey("2026-08-05"), "05.08.2026");
});
