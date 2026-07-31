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
  if (percent < 33) {
    return {
      label: "Niedrig",
      bar: "bg-red-500",
      text: "text-red-700",
      soft: "bg-red-50",
      border: "border-red-200",
    };
  }
  if (percent <= 66) {
    return {
      label: "Mittel",
      bar: "bg-amber-400",
      text: "text-amber-700",
      soft: "bg-amber-50",
      border: "border-amber-200",
    };
  }
  return {
    label: "Hoch",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
  };
}
