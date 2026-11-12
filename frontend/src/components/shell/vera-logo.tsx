import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function diamond(cx: number, cy: number, size: number) {
  return `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
}

export function VeraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 36"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
    >
      <polygon
        points={diamond(11, 12, 8.5)}
        className="fill-vera-mark-lime"
      />
      <polygon
        points={diamond(29, 12, 8.5)}
        className="fill-vera-mark-forest"
      />
      <polygon
        points={diamond(20, 23, 8.5)}
        className="fill-vera-mark-olive"
      />
    </svg>
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
    <Link
      to={to}
      className={cn("flex min-w-0 items-center gap-2.5 text-sm", className)}
    >
      <VeraMark />
      <span className="truncate text-[15px] font-bold tracking-wide text-vera-wordmark">
        VERA
      </span>
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
