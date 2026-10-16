import { isResponse, startExport } from "@/lib/api/service"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Ctx) {
  const { id } = await context.params
  const result = await startExport(id)
  if (isResponse(result)) return result
  return Response.json(result)
}
