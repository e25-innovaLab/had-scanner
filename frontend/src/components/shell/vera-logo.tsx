import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function diamond(cx: number, cy: number, size: number) {
  return `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
}

export function VeraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 40"
      className={cn("h-7 w-auto shrink-0", className)}
      aria-hidden="true"
    >
      <polygon
        points={diamond(12.5, 13.5, 10.5)}
        className="fill-vera-mark-lime"
      />
      <polygon
        points={diamond(35.5, 13.5, 10.5)}
        className="fill-vera-mark-forest"
      />
      <polygon
        points={diamond(24, 25, 10.5)}
        className="fill-vera-mark-olive"
      />
    </svg>
  );
}

export function VeraLogo({
  to = "/inicio",
  compact = false,
  size = "default",
  className,
}: {
  to?: string;
  compact?: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  if (size === "lg") {
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex h-[40px] w-[180px] aspect-[9/2] shrink-0 items-center gap-3 select-none",
          className,
        )}
      >
        <VeraMark className="h-[40px] w-[48px]" />
        <span className="font-sans text-[34px] leading-none font-extrabold tracking-[0.04em] text-vera-wordmark">
          VERA
        </span>
      </Link>
    );
  }

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
