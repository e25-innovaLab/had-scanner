import type { ApiBarrier, BackendProposal, Proposal } from "@/lib/api/types";
import { AI_ATTEMPTS_PER_BARRIER } from "@/lib/aula";

export function toCreateProposalResult(
  analysisId: string,
  barrier: ApiBarrier,
  raw: BackendProposal,
): { barrier: ApiBarrier; proposal: Proposal } {
  const text = raw.proposed_content;
  const remaining = Math.max(0, (barrier.remainingAttempts ?? AI_ATTEMPTS_PER_BARRIER) - 1);

  const nextBarrier: ApiBarrier = {
    ...barrier,
    hasProposal: true,
    currentProposal: text,
    draft: text,
    remainingAttempts: remaining,
    status: "pending",
    // opcional: el original del BE suele ser mejor que el seed
    original: raw.original_content || barrier.original,
    currentProposalId: String(raw.proposal_id),
  };

  const proposal: Proposal = {
    id: String(raw.proposal_id), // ← lo vas a necesitar en el paso 3
    analysisId,
    barrierId: String(raw.barrier_id),
    kind: barrier.hasProposal ? "regenerated" : "initial_variant",
    text,
    isCurrent: true,
    createdAt: new Date().toISOString(),
  };

  return { barrier: nextBarrier, proposal };
}