export default function TabNav({ activeTab, tabs, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`min-h-11 rounded-md px-3 text-sm font-bold transition ${
              isActive
                ? "bg-slate-950 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
            aria-pressed={isActive}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
