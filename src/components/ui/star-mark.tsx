/** The Nakshatra mark: an eight-point star. Decorative unless a title is given. */
export function StarMark({ className = "h-7 w-7", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="var(--color-star-500)"
        d="M16 1.5l2.9 8.6 8.2-3.9-3.9 8.2L31.5 16l-8.3 2.9 3.9 8.2-8.2-3.9L16 30.5l-2.9-8.3-8.2 3.9 3.9-8.2L.5 16l8.3-2.9-3.9-8.2 8.2 3.9z"
      />
      <circle cx="16" cy="16" r="4.2" fill="var(--color-ink-800)" />
    </svg>
  );
}
