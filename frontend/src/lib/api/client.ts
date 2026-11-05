import type {
  Analysis,
  AnalysisStatusResponse,
  ApiBarrier,
  BarriersResponse,
  ExportFile,
  Proposal,
  MaterialListResponse,
  Material,
  BackendAnalysis,
} from "@/lib/api/types";
import { toApiBarrier, toBarriersResponse } from "./mappers/backend-analysis";
import { isBackendId } from "./ids";

const DEFAULT_BASE = "";
const BACKEND_PROPOSAL_STORAGE_KEY = "vera-backend-proposal";

type BackendProposalResponse = {
  proposal_id: number;
  barrier_id: number;
  status: string;
  original_content: string;
  proposed_content: string;
  explanation: string;
};

function baseUrl() {
  const env = import.meta.env.VITE_API_BASE_URL;
  if (typeof env === "string" && env.length > 0) {
    return env.replace(/\/$/, "");
  }
  return DEFAULT_BASE;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    let message = `Error HTTP ${res.status}`;
    if (data && typeof data === "object") {
      if ("detail" in data) {
        const detail = (data as { detail: unknown }).detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (
          detail &&
          typeof detail === "object" &&
          "message" in detail &&
          typeof (detail as { message: unknown }).message === "string"
        ) {
          message = (detail as { message: string }).message;
        }
      } else if (
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
      ) {
        message = (data as { error: string }).error;
      }
    }
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

function backendProposalKey(analysisId: string, barrierId: string): string {
  return `${BACKEND_PROPOSAL_STORAGE_KEY}:${analysisId}:${barrierId}`;
}

function storedBackendProposalId(
  analysisId: string,
  barrierId: string,
): number | null {
  if (typeof window === "undefined") {
    throw new Error(
      "Las propuestas del backend solo se pueden consultar en el navegador.",
    );
  }
  const proposalId = window.localStorage.getItem(
    backendProposalKey(analysisId, barrierId),
  );
  if (proposalId === null) return null;
  if (!isBackendId(proposalId) || !Number.isSafeInteger(Number(proposalId))) {
    throw new Error("El identificador guardado de la propuesta no es válido.");
  }
  return Number(proposalId);
}

function rememberBackendProposal(
  analysisId: string,
  barrierId: string,
  proposalId: number,
): void {
  if (typeof window === "undefined") {
    throw new Error(
      "Las propuestas del backend solo se pueden guardar en el navegador.",
    );
  }
  window.localStorage.setItem(
    backendProposalKey(analysisId, barrierId),
    String(proposalId),
  );
}

function withBackendProposal(
  barrier: ApiBarrier,
  proposal: BackendProposalResponse | null,
): ApiBarrier {
  if (!proposal) return barrier;
  return {
    ...barrier,
    status:
      proposal.status === "accepted"
        ? "accepted"
        : proposal.status === "rejected"
          ? "discarded"
          : "pending",
    hasProposal: true,
    draft: null,
    currentProposal: proposal.proposed_content,
    currentProposalId: String(proposal.proposal_id),
  };
}

async function mapBackendBarriers(
  analysisId: string,
  analysis: BackendAnalysis,
): Promise<ApiBarrier[]> {
  return Promise.all(
    analysis.barriers.map(async (barrier) => {
      const barrierId = String(barrier.id);
      const proposalId = storedBackendProposalId(analysisId, barrierId);
      const apiBarrier = toApiBarrier(barrier, analysisId);
      if (proposalId === null) return apiBarrier;
      const proposal = await request<BackendProposalResponse>(
        `/proposals/${proposalId}`,
      );
      return withBackendProposal(apiBarrier, proposal);
    }),
  );
}

export const api = {
  createAnalysis(input: {
    fileName: string;
    fileSize: number;
  }): Promise<Analysis> {
    return request<Analysis>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getStatus(analysisId: string): Promise<AnalysisStatusResponse> {
    return request<AnalysisStatusResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/status`,
    );
  },

  getAnalysis(analysisId: string): Promise<Analysis> {
    return request<Analysis>(`/api/analyses/${encodeURIComponent(analysisId)}`);
  },

  listBarriers(analysisId: string): Promise<BarriersResponse> {
    return request<BarriersResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers`,
    );
  },

  listBarriersFlat(analysisId: string): Promise<{ barriers: ApiBarrier[] }> {
    if (isBackendId(analysisId)) {
      return this.getBackendAnalysis(Number(analysisId)).then(
        async (analysis) => {
          if (analysis.status === "processing") {
            throw new Error(
              "El análisis aún está en curso. Volvé cuando esté listo.",
            );
          }
          if (analysis.status === "failed") {
            throw new Error(
              analysis.error_message ??
                "El análisis falló y no hay barreras para revisar.",
            );
          }

          return { barriers: await mapBackendBarriers(analysisId, analysis) };
        },
      );
    }

    return request<{ barriers: ApiBarrier[] }>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers?flat=1`,
    );
  },

  /** Alias: misma hidratación que listBarriersFlat (analysis + GET /proposals). */
  getBarriersFlatForUi(
    analysisId: string,
  ): Promise<{ barriers: ApiBarrier[] }> {
    return this.listBarriersFlat(analysisId);
  },

  getBarrier(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    return request<ApiBarrier>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}`,
    );
  },

  createProposal(
    analysisId: string,
    barrierId: string,
    body?: { variant?: keyof ApiBarrier["variants"] },
  ): Promise<{ barrier: ApiBarrier; proposal: Proposal }> {
    if (isBackendId(analysisId)) {
      return request<BackendProposalResponse>(
        `/barriers/${encodeURIComponent(barrierId)}/proposals`,
        { method: "POST" },
      ).then(async (backendProposal) => {
        rememberBackendProposal(
          analysisId,
          barrierId,
          backendProposal.proposal_id,
        );
        const analysis = await this.getBackendAnalysis(Number(analysisId));
        const backendBarrier = analysis.barriers.find(
          (barrier) => String(barrier.id) === barrierId,
        );
        if (!backendBarrier) {
          throw new Error(
            "No se encontró la barrera asociada a la propuesta.",
          );
        }
        const barrier = withBackendProposal(
          toApiBarrier(backendBarrier, analysisId),
          backendProposal,
        );
        return {
          barrier,
          proposal: {
            id: String(backendProposal.proposal_id),
            analysisId,
            barrierId,
            kind: "regenerated",
            text: backendProposal.proposed_content,
            isCurrent: true,
            createdAt: new Date().toISOString(),
          },
        };
      });
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
  },

  saveDraft(
    analysisId: string,
    barrierId: string,
    draft: string,
  ): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      return Promise.reject(
        new ApiError(501, "El backend todavía no permite guardar borradores."),
      );
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/draft`,
      {
        method: "PUT",
        body: JSON.stringify({ draft }),
      },
    );
  },

  accept(
    analysisId: string,
    barrierId: string,
    draft?: string,
  ): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      return this.updateBackendProposalStatus(analysisId, barrierId, "accept");
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ draft }),
      },
    );
  },

  discard(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      return this.updateBackendProposalStatus(analysisId, barrierId, "reject");
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/discard`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  reopen(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      return Promise.reject(
        new ApiError(501, "El backend todavía no permite reabrir propuestas."),
      );
    }

    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/reopen`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  export(analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
  }> {
    if (isBackendId(analysisId)) {
      return Promise.reject(
        new ApiError(
          501,
          "El backend todavía no ofrece exportación de archivos.",
        ),
      );
    }

    return request(`/api/analyses/${encodeURIComponent(analysisId)}/export`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getExports(analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
    appliedChanges: string[];
    discardedChanges: string[];
    summary: { accepted: number; discarded: number; total: number };
  }> {
    if (isBackendId(analysisId)) {
      return Promise.reject(
        new ApiError(
          501,
          "El backend todavía no ofrece exportación de archivos.",
        ),
      );
    }

    return request(`/api/analyses/${encodeURIComponent(analysisId)}/exports`);
  },

  uploadMaterial(file: File): Promise<Material> {
    const form = new FormData();
    form.append("file", file);
    return request<Material>("/materials", {
      method: "POST",
      body: form,
    });
  },

  listMaterials(): Promise<MaterialListResponse> {
    return request<MaterialListResponse>("/materials");
  },

  async isBackendHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl()}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  analyzeMaterial(materialId: number): Promise<BackendAnalysis> {
    return request<BackendAnalysis>(`/materials/${materialId}/analysis`, {
      method: "POST",
    });
  },

  getBackendAnalysis(analysisId: number): Promise<BackendAnalysis> {
    return request<BackendAnalysis>(`/analysis/${analysisId}`);
  },

  async updateBackendProposalStatus(
    analysisId: string,
    barrierId: string,
    action: "accept" | "reject",
  ): Promise<ApiBarrier> {
    const proposalId = storedBackendProposalId(analysisId, barrierId);
    if (proposalId === null) {
      throw new Error("Primero generá una propuesta para esta barrera.");
    }
    const proposal = await request<BackendProposalResponse>(
      `/adaptations/${proposalId}/${action}`,
      { method: "POST" },
    );
    const analysis = await this.getBackendAnalysis(Number(analysisId));
    const backendBarrier = analysis.barriers.find(
      (item) => String(item.id) === barrierId,
    );
    if (!backendBarrier) {
      throw new Error("No se encontró la barrera actualizada.");
    }
    return withBackendProposal(
      toApiBarrier(backendBarrier, analysisId),
      proposal,
    );
  },

  async getBarriersForUi(analysisId: string): Promise<BarriersResponse> {
    if (isBackendId(analysisId)) {
      const analysis = await this.getBackendAnalysis(Number(analysisId));

      if (analysis.status === "processing") {
        throw new Error(
          "El análisis aún está en curso. Volvé cuando esté listo.",
        );
      }
      if (analysis.status === "failed") {
        throw new Error(
          analysis.error_message ??
            "El análisis falló y no hay barreras para revisar.",
        );
      }

      const response = toBarriersResponse(analysis);
      const barriers = await mapBackendBarriers(analysisId, analysis);
      const barriersById = new Map(
        barriers.map((barrier) => [barrier.id, barrier]),
      );
      return {
        ...response,
        groups: response.groups.map((group) => ({
          ...group,
          items: group.items.map((item) => {
            const barrier = barriersById.get(item.id);
            return barrier ? { ...item, status: barrier.status } : item;
          }),
        })),
      };
    }
    return this.listBarriers(analysisId);
  },
};
