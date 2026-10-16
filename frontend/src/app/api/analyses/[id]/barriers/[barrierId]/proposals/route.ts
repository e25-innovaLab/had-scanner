import { createProposal, isResponse } from "@/lib/api/service"
import type { ApiBarrier } from "@/lib/api/types"

type Ctx = { params: Promise<{ id: string; barrierId: string }> }

export async function POST(request: Request, context: Ctx) {
  const { id, barrierId } = await context.params
  let body: { variant?: keyof ApiBarrier["variants"] } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    body = {}
  }
  const result = await createProposal(id, barrierId, body)
  if (isResponse(result)) return result
  return Response.json(result, { status: 201 })
}
