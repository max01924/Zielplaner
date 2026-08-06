import assert from "node:assert/strict";
import test from "node:test";
import {
  accentContrastColor,
  normalizeSettings,
  resolvedAccentColor,
  STANDARD_ACCENT,
} from "./settings.js";

test("normalizes legacy and invalid settings safely", () => {
  assert.deepEqual(normalizeSettings({ startMode: "habits", startTab: "weekly" }), {
    startMode: "habits",
    startTab: "weekly",
    theme: "dark",
    accentMode: "standard",
    accentColor: STANDARD_ACCENT,
  });
  assert.equal(normalizeSettings({ theme: "unknown", accentColor: "red" }).theme, "dark");
});

test("resolves custom accents and readable contrast colors", () => {
  assert.equal(resolvedAccentColor({ accentMode: "custom", accentColor: "#abcdef" }), "#ABCDEF");
  assert.equal(accentContrastColor("#F5D90A"), "#151517");
  assert.equal(accentContrastColor("#402020"), "#F2F2F0");
});
