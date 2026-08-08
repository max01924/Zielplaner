import { ChevronDown, Image, Moon, Palette, Save, Sun, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { validateBackgroundFile } from "../utils/backgroundImage.js";
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

export default function SettingsDialog({ settings, backgroundImageUrl, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState(null);
  const [removeStoredBackground, setRemoveStoredBackground] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const activeBackgroundPreview = removeStoredBackground
    ? null
    : (backgroundPreviewUrl || backgroundImageUrl);

  useEffect(() => {
    if (!backgroundFile) {
      setBackgroundPreviewUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(backgroundFile);
    setBackgroundPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [backgroundFile]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (isSaving) return;
        if (paletteOpen) setPaletteOpen(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose, paletteOpen]);

  function chooseBackgroundFile(event) {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (!file) return;
    try {
      validateBackgroundFile(file);
      setBackgroundFile(file);
      setRemoveStoredBackground(false);
      setSaveError("");
      setDraft((current) => ({ ...current, backgroundMode: "custom" }));
    } catch (error) {
      setSaveError(error.message);
    }
  }

  async function saveSettings() {
    try {
      setIsSaving(true);
      setSaveError("");
      await onSave(draft, {
        file: backgroundFile,
        remove: removeStoredBackground,
      });
    } catch (error) {
      setSaveError(error.message);
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/80 px-4 py-8 backdrop-blur-sm sm:items-center sm:py-12"
      onMouseDown={(event) => {
        if (!isSaving && event.target === event.currentTarget) onClose();
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
              onClick={saveSettings}
              disabled={isSaving}
              className="grid h-10 w-10 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-ink"
              aria-label="Einstellungen speichern"
              title="Speichern"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
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

          <fieldset>
            <legend className="mb-3 text-[10px] font-bold uppercase text-subtle">Hintergrund</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, backgroundMode: "default" }))}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-xs font-black uppercase transition ${
                  draft.backgroundMode === "default"
                    ? "bg-ink text-inverse"
                    : "bg-depth-inset text-muted shadow-inset hover:text-ink"
                }`}
                aria-pressed={draft.backgroundMode === "default"}
              >
                <Palette className="h-4 w-4" />
                Standard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeBackgroundPreview) {
                    setDraft((current) => ({ ...current, backgroundMode: "custom" }));
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-4 text-xs font-black uppercase transition ${
                  draft.backgroundMode === "custom"
                    ? "bg-accent text-accent-contrast"
                    : "bg-depth-inset text-muted shadow-inset hover:text-ink"
                }`}
                aria-pressed={draft.backgroundMode === "custom"}
              >
                <Image className="h-4 w-4" />
                Eigenes Bild
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={chooseBackgroundFile}
              className="sr-only"
              aria-label="Hintergrundbild auswählen"
            />

            <div className="mt-3 overflow-hidden rounded-control bg-canvas-deep">
              {activeBackgroundPreview ? (
                <div className="relative aspect-[16/7] min-h-32">
                  <img
                    src={activeBackgroundPreview}
                    alt="Vorschau des eigenen Hintergrundbilds"
                    className="h-full w-full object-cover"
                    style={{
                      filter: `blur(${draft.backgroundBlur}px)`,
                      transform: draft.backgroundBlur ? "scale(1.06)" : "none",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-canvas/70 p-2 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink transition hover:bg-surface-hover"
                      aria-label="Hintergrundbild ersetzen"
                      title="Bild ersetzen"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBackgroundFile(null);
                        setRemoveStoredBackground(true);
                        setDraft((current) => ({ ...current, backgroundMode: "default" }));
                      }}
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink transition hover:bg-surface-hover"
                      aria-label="Hintergrundbild entfernen"
                      title="Bild entfernen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-32 w-full items-center justify-center gap-2 px-5 text-sm font-bold text-muted transition hover:bg-surface-hover hover:text-ink"
                >
                  <Upload className="h-4 w-4 text-accent" />
                  Bild auswählen
                </button>
              )}
            </div>
            <label className={`mt-4 block ${activeBackgroundPreview ? "" : "opacity-40"}`}>
              <span className="mb-2 flex items-center justify-between gap-4 text-[10px] font-bold uppercase text-subtle">
                Unschärfe
                <output>{draft.backgroundBlur} px</output>
              </span>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={draft.backgroundBlur}
                onInput={(event) => setDraft((current) => ({
                  ...current,
                  backgroundBlur: Number(event.target.value),
                }))}
                disabled={!activeBackgroundPreview}
                className="background-blur-slider w-full cursor-pointer disabled:cursor-not-allowed"
                aria-label="Unschärfe des Hintergrundbilds"
              />
            </label>
            {saveError ? <p className="mt-3 text-xs font-semibold text-accent">{saveError}</p> : null}
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
