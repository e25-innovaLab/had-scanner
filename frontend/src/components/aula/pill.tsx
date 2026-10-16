import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const tones = {
  step: "bg-info text-info-foreground",
  role: "bg-media text-media-foreground",
  alta: "bg-alta text-alta-foreground",
  media: "bg-media text-media-foreground",
  baja: "bg-baja text-baja-foreground",
  ok: "bg-success-soft text-success-foreground",
  muted: "bg-secondary text-muted-foreground",
  outline: "bg-white text-foreground ring-1 ring-border",
} as const

export function Pill({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
