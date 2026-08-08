import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Repeat2, Settings, Target } from "lucide-react";
import SyncButton from "./SyncButton.jsx";

const modes = [
  { id: "goals", label: "Zielplaner", shortLabel: "Ziele", Icon: Target },
  { id: "habits", label: "Habits", Icon: Repeat2 },
];

function ModeToggle({ activeMode, onChange }) {
  return (
    <div className="bg-depth-inset grid h-11 w-[114px] grid-cols-2 gap-1 rounded-[22px] p-1 shadow-inset sm:h-12 sm:w-[300px] sm:rounded-panel lg:w-[350px]">
      {modes.map(({ id, label, shortLabel, Icon }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-[18px] px-1 text-[9px] font-black uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/70 sm:rounded-[24px] sm:px-4 sm:text-xs lg:text-sm ${
              isActive
                ? "bg-accent text-accent-contrast shadow-inset"
                : "text-muted hover:bg-surface-hover hover:text-ink"
            }`}
            aria-pressed={isActive}
          >
            <Icon className={`hidden h-4 w-4 shrink-0 sm:block sm:h-5 sm:w-5 ${isActive ? "text-ink" : ""}`} />
            <span className="sm:hidden">{shortLabel ?? label}</span>
            <span className="hidden truncate sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CompactReviewControl({ reviews }) {
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!controlRef.current?.contains(event.target)) setIsOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!reviews.length) return null;

  function activateReview(review) {
    setIsOpen(false);
    review.onClick();
  }

  function handleClick() {
    if (reviews.length === 1) {
      activateReview(reviews[0]);
      return;
    }
    setIsOpen((current) => !current);
  }

  return (
    <div ref={controlRef} className="relative xl:hidden">
      <button
        type="button"
        onClick={handleClick}
        className="daily-review-notice relative grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:brightness-125 sm:h-10 sm:w-10 sm:rounded-control"
        aria-label={reviews.length === 1 ? reviews[0].label : `${reviews.length} Reviews können ausgefüllt werden`}
        aria-expanded={reviews.length > 1 ? isOpen : undefined}
        aria-haspopup={reviews.length > 1 ? "menu" : undefined}
        title={reviews.length === 1 ? reviews[0].label : "Offene Reviews"}
      >
        <MessageSquareText className="h-4 w-4 text-accent" />
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-black leading-none text-accent-contrast">
          {reviews.length}
        </span>
      </button>

      {isOpen ? (
        <div className="liquid-glass-popover absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-control p-2" role="menu">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => activateReview(review)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-black text-ink transition hover:bg-surface-hover"
              role="menuitem"
            >
              <MessageSquareText className="h-4 w-4 shrink-0 text-accent" />
              {review.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AppNavigation({
  activeMode,
  onModeChange,
  onOpenSettings,
  pendingDailyReview,
  pendingWeeklyReview,
  onOpenDailyReview,
  onOpenWeeklyReview,
  onSynced,
}) {
  const reviews = [
    pendingDailyReview
      ? { id: "daily", label: "Tagesreview kann ausgefüllt werden", onClick: onOpenDailyReview }
      : null,
    pendingWeeklyReview
      ? { id: "weekly", label: "Wochenreview kann ausgefüllt werden", onClick: onOpenWeeklyReview }
      : null,
  ].filter(Boolean);

  return (
    <nav className="fixed inset-x-3 top-3 z-40 sm:inset-x-4 sm:top-4" aria-label="Hauptnavigation">
      <div className="liquid-glass-nav mx-auto h-16 w-full max-w-[1600px] rounded-[26px] px-2 sm:h-[72px] sm:rounded-panel sm:px-3 lg:px-4">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-3">
          <div className="flex min-w-0 items-center gap-3 justify-self-start">
            <button
              type="button"
              onClick={onOpenSettings}
              className="bg-depth-inset grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted shadow-inset transition hover:text-ink hover:brightness-125 sm:h-10 sm:w-10 sm:rounded-control"
              aria-label="Einstellungen öffnen"
              title="Einstellungen"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="hidden items-center gap-3 lg:flex" aria-label="Zielplaner">
              <span className="h-10 w-1 rounded-full bg-accent shadow-[0_0_24px_rgb(var(--color-accent-rgb)/0.35)]" />
              <div>
                <p className="text-sm font-black uppercase text-ink">Zielplaner</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase text-subtle">Planungssystem</p>
              </div>
            </div>
          </div>

          <ModeToggle activeMode={activeMode} onChange={onModeChange} />

          <div className="flex min-w-0 items-center justify-self-end gap-0.5 sm:gap-2">
            <CompactReviewControl reviews={reviews} />

            <div className="hidden items-center gap-2 xl:flex">
              {reviews.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  onClick={review.onClick}
                  className="daily-review-notice inline-flex min-h-11 max-w-[160px] items-center gap-2 rounded-control px-3 text-left text-xs font-black leading-tight text-ink transition hover:brightness-125"
                >
                  <MessageSquareText className="h-4 w-4 shrink-0 text-accent" />
                  {review.label}
                </button>
              ))}
            </div>

            <SyncButton onSynced={onSynced} />
          </div>
        </div>
      </div>
    </nav>
  );
}
