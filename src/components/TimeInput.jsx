import { Clock3 } from "lucide-react";

export default function TimeInput({ value, onValueChange, className = "", ...props }) {
  return (
    <div className="relative">
      <input
        {...props}
        type="time"
        value={value}
        onInput={(event) => onValueChange(event.currentTarget.value)}
        className={`time-input pr-12 ${className}`}
      />
      <Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
    </div>
  );
}
