export function clampPercent(value) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function checklistProgress(items) {
  if (!items.length) {
    return 0;
  }
  const done = items.filter((item) => item.done).length;
  return clampPercent((done / items.length) * 100);
}

export function progressTone(percent) {
  const label = percent < 33 ? "Niedrig" : percent <= 66 ? "Mittel" : "Hoch";

  return {
    label,
    bar: "bg-accent",
    text: "text-ink",
    soft: "bg-depth-panel",
    border: "",
  };
}
