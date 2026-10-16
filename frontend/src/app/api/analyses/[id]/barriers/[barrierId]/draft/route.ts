import { isResponse, saveDraft } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string; barrierId: string }> }

export async function PUT(request: Request, context: Ctx) {
  const { id, barrierId } = await context.params
  let body: { draft?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 })
  }
  if (typeof body.draft !== "string") {
    return Response.json({ error: "draft es requerido" }, { status: 400 })
  }
  const result = await saveDraft(id, barrierId, body.draft)
  if (isResponse(result)) return result
  return Response.json(result)
}
