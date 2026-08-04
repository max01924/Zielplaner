export default function DecorativeAccent({
  shape = "diamond",
  size = 16,
  className = "",
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`pointer-events-none absolute text-accent opacity-20 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shape === "star" ? (
        <path d="M12 2.75c.45 5.8 3.45 8.8 9.25 9.25-5.8.45-8.8 3.45-9.25 9.25C11.55 15.45 8.55 12.45 2.75 12 8.55 11.55 11.55 8.55 12 2.75Z" />
      ) : (
        <path d="m12 3 9 9-9 9-9-9 9-9Z" />
      )}
    </svg>
  );
}
