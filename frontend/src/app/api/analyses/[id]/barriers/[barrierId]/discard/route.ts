import { isResponse, setBarrierStatus } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string; barrierId: string }> }

export async function POST(_request: Request, context: Ctx) {
  const { id, barrierId } = await context.params
  const result = await setBarrierStatus(id, barrierId, "discarded")
  if (isResponse(result)) return result
  return Response.json(result)
}
