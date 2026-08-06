import { ChevronDown, Moon, Palette, Save, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STANDARD_ACCENT } from "../utils/settings.js";

const modeOptions = [
  { id: "goals", label: "Zielplaner" },
  { id: "habits", label: "Habits" },
];

const tabOptions = [
  { id: "daily", label: "Täglich" },
  { id: "weekly", label: "Wöchentlich" },
  { id: "monthly", label: "Monatlich" },
  { id: "yearly", label: "Jährlich" },
];

const themeOptions = [
  { id: "light", label: "Hell", Icon: Sun },
  { id: "dark", label: "Dunkel", Icon: Moon },
];

const accentPalette = [
  "#B34749",
  "#C65D34",
  "#B58A32",
  "#397A52",
  "#33727A",
  "#3B638F",
  "#6F4D8E",
  "#9B3F78",
];

export default function SettingsDialog({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, paletteOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm sm:items-center sm:py-12"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-depth-panel w-full max-w-xl rounded-panel p-5 text-ink shadow-panel sm:p-7"
      >
        <header className="surface-divider flex items-start justify-between gap-4 pb-5">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-subtle">System</p>
            <h2 id="settings-title" className="text-2xl font-black uppercase text-ink">Einstellungen</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
              aria-label="Einstellungen speichern"
              title="Speichern"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
              aria-label="Einstellungen schließen"
              title="Schließen"
              autoFocus
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="space-y-7 pt-6">
          <fieldset>
            <legend className="mb-3 text-[10px] font-bold uppercase text-subtle">Farbschema</legend>
            <div className="bg-depth-inset grid grid-cols-2 gap-1 rounded-control p-1 shadow-inset">
              {themeOptions.map(({ id, label, Icon }) => {
                const isActive = draft.theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, theme: id }))}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black uppercase transition ${
                      isActive ? "bg-ink text-inverse" : "text-muted hover:bg-surface-hover hover:text-ink"
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="relative">
            <legend className="mb-3 text-[10px] font-bold uppercase text-subtle">Akzentfarbe</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft((current) => ({ ...current, accentMode: "standard" }));
                  setPaletteOpen(false);
                }}
                className={`flex min-h-12 items-center gap-3 rounded-control px-4 text-left text-xs font-black uppercase transition ${
                  draft.accentMode === "standard"
                    ? "bg-depth-control text-ink shadow-inset ring-2 ring-accent"
                    : "bg-depth-inset text-muted shadow-inset hover:text-ink"
                }`}
                aria-pressed={draft.accentMode === "standard"}
              >
                <span className="h-5 w-5 shrink-0 rounded-md" style={{ backgroundColor: STANDARD_ACCENT }} />
                Standard
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft((current) => ({ ...current, accentMode: "custom" }));
                  setPaletteOpen((open) => !open || draft.accentMode !== "custom");
                }}
                className={`flex min-h-12 items-center gap-3 rounded-control px-4 text-left text-xs font-black uppercase transition ${
                  draft.accentMode === "custom"
                    ? "bg-depth-control text-ink shadow-inset ring-2 ring-accent"
                    : "bg-depth-inset text-muted shadow-inset hover:text-ink"
                }`}
                aria-pressed={draft.accentMode === "custom"}
                aria-expanded={paletteOpen}
              >
                <span className="h-5 w-5 shrink-0 rounded-md" style={{ backgroundColor: draft.accentColor }} />
                <span className="min-w-0 flex-1">Frei</span>
                <ChevronDown className={`h-4 w-4 transition ${paletteOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {paletteOpen ? (
              <div className="bg-depth-panel absolute inset-x-0 top-full z-20 mt-2 rounded-panel p-4 shadow-panel sm:left-auto sm:w-80">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-accent" />
                    <p className="text-xs font-black uppercase text-ink">Farbpalette</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-hover hover:text-ink"
                    aria-label="Farbpalette schließen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {accentPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({ ...current, accentMode: "custom", accentColor: color }));
                        setPaletteOpen(false);
                      }}
                      className={`aspect-square rounded-xl transition hover:scale-105 ${
                        draft.accentColor === color ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Akzentfarbe ${color}`}
                    />
                  ))}
                </div>
                <label className="mt-4 flex items-center justify-between gap-4 surface-divider pb-1 text-xs font-bold text-muted">
                  Eigene Farbe
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      accentMode: "custom",
                      accentColor: event.target.value.toUpperCase(),
                    }))}
                    className="h-10 w-16 cursor-pointer rounded-lg bg-transparent"
                    aria-label="Eigene Akzentfarbe wählen"
                  />
                </label>
              </div>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[10px] font-bold uppercase text-subtle">Startbereich</legend>
            <div className="bg-depth-inset grid grid-cols-2 gap-1 rounded-control p-1 shadow-inset">
              {modeOptions.map((option) => {
                const isActive = draft.startMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, startMode: option.id }))}
                    className={`min-h-11 rounded-xl px-3 text-xs font-black uppercase transition ${
                      isActive ? "bg-accent text-accent-contrast" : "text-muted hover:bg-surface-hover hover:text-ink"
                    }`}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset disabled={draft.startMode !== "goals"} className="disabled:opacity-40">
            <legend className="mb-3 text-[10px] font-bold uppercase text-subtle">Planungsebene</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tabOptions.map((option) => {
                const isActive = draft.startTab === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, startTab: option.id }))}
                    className={`min-h-11 rounded-control px-3 text-xs font-black uppercase transition ${
                      isActive
                        ? "bg-ink text-inverse shadow-inset"
                        : "bg-depth-inset text-muted shadow-inset hover:text-ink"
                    }`}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  );
}
