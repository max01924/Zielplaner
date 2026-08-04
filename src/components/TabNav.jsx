export default function TabNav({ activeTab, tabs, onChange }) {
  return (
    <div
      className="grid w-full max-w-[620px] gap-3 sm:gap-6"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative min-h-11 px-0.5 text-[10px] font-black uppercase transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/70 sm:px-1 sm:text-sm ${
              isActive
                ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent"
                : "text-subtle hover:text-ink"
            }`}
            aria-pressed={isActive}
            aria-label={tab.label}
          >
            <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
