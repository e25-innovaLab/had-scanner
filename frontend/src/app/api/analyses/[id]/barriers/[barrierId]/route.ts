import { getBarrier, isResponse } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string; barrierId: string }> }

export async function GET(_request: Request, context: Ctx) {
  const { id, barrierId } = await context.params
  const result = await getBarrier(id, barrierId)
  if (isResponse(result)) return result
  return Response.json(result)
}
