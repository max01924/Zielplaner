import { addDays, addWeeks, dateFromKey, startOfIsoWeek, toDateKey } from "./date.js";

export function weeklyReviewAvailableAt(weekKey) {
  const sunday = addDays(startOfIsoWeek(dateFromKey(weekKey)), 6);
  sunday.setHours(19, 0, 0, 0);
  return sunday;
}

export function canFillWeeklyReview(weekKey, now = new Date()) {
  return now >= weeklyReviewAvailableAt(weekKey);
}

export function pendingWeeklyReviewWeek(reviews, now = new Date()) {
  const currentWeek = startOfIsoWeek(now);
  const currentAvailableAt = weeklyReviewAvailableAt(toDateKey(currentWeek));
  const candidateWeek = now >= currentAvailableAt ? currentWeek : addWeeks(currentWeek, -1);
  const weekKey = toDateKey(candidateWeek);
  const availableAt = weeklyReviewAvailableAt(weekKey);
  const expiresAt = addDays(availableAt, 1);
  if (now < availableAt || now >= expiresAt) return null;
  const review = reviews.find((item) => item.weekKey === weekKey);
  return review?.completedAt ? null : weekKey;
}
