import { AI_ATTEMPTS_PER_BARRIER, DETAIL_BARRIERS } from "@/lib/aula"

export type BarrierDecision = "pending" | "accepted" | "discarded"

export type BarrierSessionItem = {
  decision: BarrierDecision
  remaining: number
  hasProposal: boolean
  draft: string
  proposal: string | null
}

export type BarrierSession = Record<string, BarrierSessionItem>

const STORAGE_KEY = "aula-barrier-session"

function emptyItem(): BarrierSessionItem {
  return {
    decision: "pending",
    remaining: AI_ATTEMPTS_PER_BARRIER,
    hasProposal: false,
    draft: "",
    proposal: null,
  }
}

export function createEmptyBarrierSession(): BarrierSession {
  return Object.fromEntries(
    DETAIL_BARRIERS.map((item) => [item.barrierId, emptyItem()])
  )
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined"
}

export function readBarrierSession(): BarrierSession {
  const base = createEmptyBarrierSession()
  if (!canUseStorage()) return base

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as BarrierSession
    for (const id of Object.keys(base)) {
      if (parsed[id]) base[id] = { ...base[id], ...parsed[id] }
    }
    return base
  } catch {
    return base
  }
}

export function writeBarrierSession(session: BarrierSession) {
  if (!canUseStorage()) return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function patchBarrierSession(
  barrierId: string,
  patch: Partial<BarrierSessionItem>
) {
  const session = readBarrierSession()
  session[barrierId] = {
    ...(session[barrierId] ?? emptyItem()),
    ...patch,
  }
  writeBarrierSession(session)
  return session
}

export function setBarrierDecision(
  barrierId: string,
  decision: BarrierDecision
) {
  return patchBarrierSession(barrierId, { decision })
}
