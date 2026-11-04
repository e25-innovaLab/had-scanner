type CachedProposal = {
    proposalId: string;
    text: string;
    original: string;
  };
  
  function key(analysisId: string, barrierId: string) {
    return `vera:proposal:${analysisId}:${barrierId}`;
  }
  
  export function saveCachedProposal(
    analysisId: string,
    barrierId: string,
    data: CachedProposal,
  ) {
    sessionStorage.setItem(key(analysisId, barrierId), JSON.stringify(data));
  }
  
  export function getCachedProposal(
    analysisId: string,
    barrierId: string,
  ): CachedProposal | null {
    const raw = sessionStorage.getItem(key(analysisId, barrierId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedProposal;
    } catch {
      return null;
    }
  }
  
  export function clearCachedProposal(analysisId: string, barrierId: string) {
    sessionStorage.removeItem(key(analysisId, barrierId));
  }
  
  export function applyCachedProposals(
    analysisId: string,
    barriers: import("./types").ApiBarrier[],
  ) {
    return barriers.map((b) => {
      const cached = getCachedProposal(analysisId, b.id);
      if (!cached) return b;
      return {
        ...b,
        hasProposal: true,
        currentProposal: cached.text,
        draft: cached.text,
        currentProposalId: cached.proposalId,
        original: cached.original || b.original,
      };
    });
  }