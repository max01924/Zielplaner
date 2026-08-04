import { addDays, dateFromKey, toDateKey } from "./date.js";

export function dailyReviewAvailableAt(dateKey) {
  const date = dateFromKey(dateKey);
  date.setHours(19, 0, 0, 0);
  return date;
}

export function canFillDailyReview(dateKey, now = new Date()) {
  return now >= dailyReviewAvailableAt(dateKey);
}

export function pendingDailyReviewDate(reviews, now = new Date()) {
  const candidate = new Date(now);
  if (now.getHours() < 19) {
    candidate.setDate(candidate.getDate() - 1);
  }
  const dateKey = toDateKey(candidate);
  const availableAt = dailyReviewAvailableAt(dateKey);
  const expiresAt = addDays(availableAt, 1);
  if (now < availableAt || now >= expiresAt) return null;
  const review = reviews.find((item) => item.dateKey === dateKey);
  return review?.completedAt ? null : dateKey;
}
