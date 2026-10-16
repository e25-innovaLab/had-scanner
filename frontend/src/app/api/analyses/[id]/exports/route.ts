import { getExports, isResponse } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params
  const result = await getExports(id)
  if (isResponse(result)) return result
  return Response.json(result)
}
