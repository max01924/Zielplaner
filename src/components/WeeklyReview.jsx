import ReviewPanel from "./ReviewPanel.jsx";

export default function WeeklyReview({ review, canEdit, onSave }) {
  return (
    <ReviewPanel
      id="weekly-review"
      eyebrow="Wochenabschluss"
      title="Wochenreview"
      review={review}
      canEdit={canEdit}
      lockedText="Am Sonntag ab 19:00 Uhr verfügbar."
      onSave={onSave}
      flat
    />
  );
}
