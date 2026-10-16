"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SideNav } from "@/components/shell/side-nav"
import { HOME_LINKS } from "@/lib/aula"
import { cn } from "@/lib/utils"

export function HomeNav() {
  const pathname = usePathname()

  return (
    <SideNav label="Secciones">
      {HOME_LINKS.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-info font-medium text-info-foreground"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </SideNav>
  )
}
