"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import { UploadPanel } from "@/components/aula/upload-panel"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { api } from "@/lib/api/client"
import { storeAnalysisId, withAnalysisId, writeFlowResume } from "@/lib/api/url"
import { cn } from "@/lib/utils"

export function CargarStep() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("")
  const [mode, setMode] = useState<"archivo" | "texto">("archivo")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinue =
    mode === "archivo" ? Boolean(file) : text.trim().length > 0

  async function continueToAnalyze() {
    if (!canContinue || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const analysis = await api.createAnalysis(
        mode === "archivo" && file
          ? { fileName: file.name, fileSize: file.size }
          : {
              fileName: "texto-pegado.txt",
              fileSize: new TextEncoder().encode(text).length,
            }
      )
      storeAnalysisId(analysis.id)
      writeFlowResume(analysis.id, "/analisis/analizar")
      navigate(withAnalysisId("/analisis/analizar", analysis.id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el análisis"
      )
      setSubmitting(false)
    }
  }

  return (
    <>
      <UploadPanel
        onSelectionChange={({
          file: nextFile,
          text: nextText,
          mode: nextMode,
        }) => {
          setFile(nextFile)
          setText(nextText)
          setMode(nextMode)
          setError(null)
        }}
      />
      {error ? (
        <p className="mt-3 text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 px-4"
          )}
        >
          Volver al inicio
        </Link>
        <Button
          type="button"
          size="lg"
          className="h-10 px-4"
          disabled={!canContinue || submitting}
          onClick={() => void continueToAnalyze()}
        >
          {submitting ? "Creando análisis..." : "Siguiente: Analizar"}
        </Button>
      </div>
    </>
  )
}
