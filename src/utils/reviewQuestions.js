export function reviewForPeriod(reviews, periodKey, keyField) {
  const exactReview = reviews.find((review) => (
    review[keyField] === periodKey && review.hasReview !== false
  ));
  if (exactReview) return exactReview;

  const previousReview = reviews
    .filter((review) => (
      review[keyField] < periodKey
      && review.hasReview !== false
      && Array.isArray(review.questions)
    ))
    .sort((left, right) => right[keyField].localeCompare(left[keyField]))[0];
  if (!previousReview) return null;

  return {
    [keyField]: periodKey,
    questions: previousReview.questions.map((item) => ({ ...item, answer: "" })),
    completedAt: null,
  };
}
