export function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-[11px] font-semibold text-primary"
      aria-label={`${count} sin leer`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
