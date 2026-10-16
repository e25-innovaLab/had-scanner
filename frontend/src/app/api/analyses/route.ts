import { createAnalysis } from "@/lib/api/service"

export async function POST(request: Request) {
  let body: { fileName?: string; fileSize?: number; text?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 })
  }

  const fileName =
    body.fileName?.trim() ||
    (body.text?.trim() ? "texto-pegado.txt" : "")
  if (!fileName) {
    return Response.json(
      { error: "Se requiere fileName o text." },
      { status: 400 }
    )
  }

  const fileSize =
    typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
      ? body.fileSize
      : body.text
        ? new TextEncoder().encode(body.text).length
        : 0

  const analysis = await createAnalysis({ fileName, fileSize })
  return Response.json(analysis, { status: 201 })
}
