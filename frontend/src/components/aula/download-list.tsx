"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ExportFile } from "@/lib/api/types"

export function DownloadList({ files }: { files: ExportFile[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({})

  function download(name: string) {
    const blob = new Blob(
      [`VERA — ${name}\nMaterial simulado exportado desde la API local.\n`],
      { type: "text/plain;charset=utf-8" }
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name.replace(/\.(pdf|docx)$/i, ".txt")
    anchor.click()
    URL.revokeObjectURL(url)
    setDone((current) => ({ ...current, [name]: true }))
  }

  if (files.length === 0) {
    return (
      <Card className="px-4 py-4 text-sm text-muted-foreground">
        No hay archivos de exportación todavía.
      </Card>
    )
  }

  return (
    <Card className="gap-0 divide-y divide-border py-0">
      {files.map((file) => (
        <div
          key={file.name}
          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{file.detail}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 sm:shrink-0"
            onClick={() => download(file.name)}
          >
            {done[file.name] ? "Descargado" : "Descargar"}
          </Button>
        </div>
      ))}
    </Card>
  )
}
