import {
  isResponse,
  listBarriers,
  listBarriersFlat,
} from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params
  const flat = new URL(request.url).searchParams.get("flat") === "1"
  const result = flat ? await listBarriersFlat(id) : await listBarriers(id)
  if (isResponse(result)) return result
  if (flat) return Response.json({ barriers: result })
  return Response.json(result)
}
