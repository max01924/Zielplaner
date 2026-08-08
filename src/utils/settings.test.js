import assert from "node:assert/strict";
import test from "node:test";
import {
  accentContrastColor,
  applyAppearance,
  applyBackgroundImage,
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
    backgroundMode: "default",
    backgroundBlur: 0,
  });
  assert.equal(normalizeSettings({ theme: "unknown", accentColor: "red" }).theme, "dark");
  assert.equal(normalizeSettings({ backgroundMode: "custom" }).backgroundMode, "custom");
  assert.equal(normalizeSettings({ backgroundBlur: 99 }).backgroundBlur, 24);
  assert.equal(normalizeSettings({ backgroundBlur: -4 }).backgroundBlur, 0);
});

test("resolves custom accents and readable contrast colors", () => {
  assert.equal(resolvedAccentColor({ accentMode: "custom", accentColor: "#abcdef" }), "#ABCDEF");
  assert.equal(accentContrastColor("#F5D90A"), "#151517");
  assert.equal(accentContrastColor("#402020"), "#F2F2F0");
});

test("applies and clears a custom background without persisting its object URL", () => {
  const properties = new Map();
  const root = {
    dataset: {},
    style: {
      setProperty(name, value) {
        properties.set(name, value);
      },
      removeProperty(name) {
        properties.delete(name);
      },
    },
  };

  applyBackgroundImage({ backgroundMode: "custom" }, "blob:test-image", root);
  assert.equal(root.dataset.background, "custom");
  assert.equal(properties.get("--custom-background-image"), 'url("blob:test-image")');

  applyAppearance({ backgroundBlur: 13 }, root);
  assert.equal(properties.get("--custom-background-blur"), "13px");

  applyBackgroundImage({ backgroundMode: "default" }, "blob:test-image", root);
  assert.equal(root.dataset.background, "default");
  assert.equal(properties.has("--custom-background-image"), false);
});
