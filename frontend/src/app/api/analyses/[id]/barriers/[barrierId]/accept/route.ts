import { isResponse, setBarrierStatus } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string; barrierId: string }> }

export async function POST(request: Request, context: Ctx) {
  const { id, barrierId } = await context.params
  let draft: string | undefined
  try {
    const body = (await request.json()) as { draft?: string }
    draft = body.draft
  } catch {
    draft = undefined
  }
  const result = await setBarrierStatus(id, barrierId, "accepted", draft)
  if (isResponse(result)) return result
  return Response.json(result)
}
