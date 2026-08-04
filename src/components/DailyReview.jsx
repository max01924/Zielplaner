import ReviewPanel from "./ReviewPanel.jsx";

export default function DailyReview({ review, canEdit, onSave }) {
  return (
    <ReviewPanel
      id="daily-review"
      eyebrow="Tagesabschluss"
      title="Tagesreview"
      review={review}
      canEdit={canEdit}
      lockedText="Ab 19:00 Uhr verfügbar."
      onSave={onSave}
      flat
      allowReopen
    />
  );
}
