import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function VeraMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-sm",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden="true">
        <path d="M8 1.5 14.5 8 8 14.5 1.5 8 8 1.5Z" />
      </svg>
    </span>
  );
}

export function VeraLogo({
  to = "/inicio",
  compact = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-2.5 text-sm", className)}>
      <VeraMark />
      <span className="truncate font-semibold tracking-tight text-ink">VERA</span>
      {compact ? null : (
        <>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <span className="truncate text-muted-foreground">
            Accesibilidad de materiales
          </span>
        </>
      )}
    </Link>
  );
}
