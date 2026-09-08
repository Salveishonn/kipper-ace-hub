import { cn } from "@/lib/utils";

const TONES = {
  open: "bg-emerald-50 text-emerald-900 border-emerald-200",
  progress: "bg-amber-50 text-amber-950 border-amber-200",
  resolved: "bg-sky-50 text-sky-950 border-sky-200",
  closed: "bg-muted text-muted-foreground border-border",
  default: "bg-secondary text-secondary-foreground border-transparent",
} as const;

export type StatusTone = keyof typeof TONES;

export function statusToneFromConsulta(status: string): StatusTone {
  if (status === "abierto") return "open";
  if (status === "en_gestion") return "progress";
  if (status === "resuelto") return "resolved";
  if (status === "cerrado") return "closed";
  return "default";
}

export function StatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
