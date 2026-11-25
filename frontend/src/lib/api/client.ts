import type {
  AnalysisStatusResponse,
  ApiBarrier,
  BarriersResponse,
  ExportFile,
  Proposal,
  MaterialListResponse,
  Material,
  BackendAnalysis,
  FinalizeResponse,
  FinalizedDocument,
} from "@/lib/api/types";
import { toUserFacingErrorMessage } from "@/lib/api/ai-availability";
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

type BackendBarrierDetail = {
  id: number;
  type: string;
  title: string;
  severity: string;
  location: { pages?: number[] } & Record<string, unknown>;
  description: string;
  justification: string;
  recommendation: string;
  detected_by: string;
  status: string;
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
    throw new ApiError(
      res.status,
      toUserFacingErrorMessage(message, {
        status: res.status,
        fallback:
          "No se pudo completar la operación. Reintentá en unos minutos.",
      }),
      data,
    );
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

function forgetBackendProposal(analysisId: string, barrierId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(backendProposalKey(analysisId, barrierId));
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
      try {
        const proposal = await request<BackendProposalResponse>(
          `/proposals/${proposalId}`,
        );
        // Tras reiniciar la base los ids se reutilizan: si la propuesta
        // guardada es de otra barrera, es un residuo y se descarta.
        if (String(proposal.barrier_id) !== barrierId) {
          forgetBackendProposal(analysisId, barrierId);
          return apiBarrier;
        }
        return withBackendProposal(apiBarrier, proposal);
      } catch (err) {
        // Propuesta guardada que ya no existe (base reiniciada o borrada):
        // no debe impedir revisar las barreras.
        if (err instanceof ApiError && err.status === 404) {
          forgetBackendProposal(analysisId, barrierId);
          return apiBarrier;
        }
        throw err;
      }
    }),
  );
}

function barrierFromDetail(
  detail: BackendBarrierDetail,
  analysisId: string,
): ApiBarrier {
  return toApiBarrier(
    {
      ...detail,
      evidences: [],
    },
    analysisId,
  );
}

export const api = {
  getStatus(analysisId: string): Promise<AnalysisStatusResponse> {
    if (!isBackendId(analysisId)) {
      return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
    }
    return this.getBackendAnalysis(Number(analysisId)).then((analysis) => ({
      id: String(analysis.analysis_id),
      status:
        analysis.status === "completed"
          ? "ready"
          : analysis.status === "failed"
            ? "failed"
            : "analyzing",
      originalFileName: analysis.material_name?.trim() || `material-${analysis.material_id}.pdf`,
      originalFileSize: 0,
      dimensionProgress: [],
    }));
  },

  listBarriers(analysisId: string): Promise<BarriersResponse> {
    if (isBackendId(analysisId)) {
      return this.getBarriersForUi(analysisId);
    }
    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
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
              toUserFacingErrorMessage(
                analysis.error_message ??
                  "El análisis falló y no hay barreras para revisar.",
                {
                  fallback: "El análisis falló y no hay barreras para revisar.",
                },
              ),
            );
          }

          return { barriers: await mapBackendBarriers(analysisId, analysis) };
        },
      );
    }

    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
  },

  /** Alias: misma hidratación que listBarriersFlat (analysis + GET /proposals). */
  getBarriersFlatForUi(
    analysisId: string,
  ): Promise<{ barriers: ApiBarrier[] }> {
    return this.listBarriersFlat(analysisId);
  },

  getBarrier(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      return request<BackendBarrierDetail>(
        `/barriers/${encodeURIComponent(barrierId)}`,
      ).then(async (detail) => {
        let barrier = barrierFromDetail(detail, analysisId);
        const proposalId = storedBackendProposalId(analysisId, barrierId);
        if (proposalId === null) return barrier;
        try {
          const proposal = await request<BackendProposalResponse>(
            `/proposals/${proposalId}`,
          );
          barrier = withBackendProposal(barrier, proposal);
        } catch {
          // propuesta guardada inválida / borrada: devolvemos la barrera igual
        }
        return barrier;
      });
    }
    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
  },

  createProposal(
    analysisId: string,
    barrierId: string,
    _body?: { variant?: keyof ApiBarrier["variants"] },
  ): Promise<{ barrier: ApiBarrier; proposal: Proposal }> {
    if (isBackendId(analysisId)) {
      return request<BackendProposalResponse>(
        `/barriers/${encodeURIComponent(barrierId)}/proposals/generate`,
        { method: "POST" },
      ).then(async (backendProposal) => {
        rememberBackendProposal(
          analysisId,
          barrierId,
          backendProposal.proposal_id,
        );
        const detail = await request<BackendBarrierDetail>(
          `/barriers/${encodeURIComponent(barrierId)}`,
        );
        const barrier = withBackendProposal(
          barrierFromDetail(detail, analysisId),
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

    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
  },

  createManualProposal(
    analysisId: string,
    barrierId: string,
    input: { proposed_content: string; explanation: string },
  ): Promise<{ barrier: ApiBarrier; proposal: Proposal }> {
    if (!isBackendId(analysisId)) {
      return Promise.reject(
        new ApiError(400, "createManualProposal solo aplica a API real."),
      );
    }

    return request<BackendProposalResponse>(
      `/barriers/${encodeURIComponent(barrierId)}/proposals`,
      {
        method: "POST",
        body: JSON.stringify({
          proposed_content: input.proposed_content,
          explanation: input.explanation,
        }),
      },
    ).then(async (backendProposal) => {
      rememberBackendProposal(
        analysisId,
        barrierId,
        backendProposal.proposal_id,
      );
      const detail = await request<BackendBarrierDetail>(
        `/barriers/${encodeURIComponent(barrierId)}`,
      );
      const barrier = withBackendProposal(
        barrierFromDetail(detail, analysisId),
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
  },

  saveDraft(
    _analysisId: string,
    _barrierId: string,
    _draft: string,
  ): Promise<ApiBarrier> {
    return Promise.reject(
      new ApiError(501, "El backend todavía no permite guardar borradores."),
    );
  },

  async accept(
    analysisId: string,
    barrierId: string,
    draft?: string,
  ): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const content = draft?.trim() ?? "";
      const proposalId = storedBackendProposalId(analysisId, barrierId);

      if (proposalId !== null) {
        if (!content) {
          return this.updateBackendProposalStatus(
            analysisId,
            barrierId,
            "accept",
          );
        }
        const existing = await request<BackendProposalResponse>(
          `/proposals/${proposalId}`,
        );
        if (existing.proposed_content.trim() === content) {
          return this.updateBackendProposalStatus(
            analysisId,
            barrierId,
            "accept",
          );
        }
        // Texto editado respecto a la propuesta guardada → nueva manual
        await this.createManualProposal(analysisId, barrierId, {
          proposed_content: content,
          explanation: "Adaptación editada por el docente.",
        });
        return this.updateBackendProposalStatus(
          analysisId,
          barrierId,
          "accept",
        );
      }

      if (!content) {
        throw new ApiError(
          400,
          "Generá una propuesta con IA o escribí una adaptación para aceptar.",
        );
      }
      await this.createManualProposal(analysisId, barrierId, {
        proposed_content: content,
        explanation: "Adaptación propuesta por el docente.",
      });
      return this.updateBackendProposalStatus(analysisId, barrierId, "accept");
    }

    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
  },

  discard(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    if (isBackendId(analysisId)) {
      const proposalId = storedBackendProposalId(analysisId, barrierId);
      if (proposalId !== null) {
        return this.updateBackendProposalStatus(
          analysisId,
          barrierId,
          "reject",
        );
      }

      return request<BackendBarrierDetail>(
        `/barriers/${encodeURIComponent(barrierId)}/reject`,
        { method: "PATCH" },
      ).then((detail) =>
        toApiBarrier(
          {
            ...detail,
            evidences: [],
          },
          analysisId,
        ),
      );
    }

    return Promise.reject(new ApiError(400, "Identificador de análisis inválido."));
  },

  reopen(_analysisId: string, _barrierId: string): Promise<ApiBarrier> {
    return Promise.reject(
      new ApiError(501, "El backend todavía no permite reabrir propuestas."),
    );
  },

  export(_analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
  }> {
    return Promise.reject(
      new ApiError(
        501,
        "El backend todavía no ofrece exportación de archivos.",
      ),
    );
  },

  getExports(_analysisId: string): Promise<{
    exportStatus: string;
    exports: ExportFile[];
    appliedChanges: string[];
    discardedChanges: string[];
    summary: { accepted: number; discarded: number; total: number };
  }> {
    return Promise.reject(
      new ApiError(
        501,
        "El backend todavía no ofrece exportación de archivos.",
      ),
    );
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

  uploadMaterialFromText(name: string, text: string): Promise<Material> {
    return request<Material>("/materials/text", {
      method: "POST",
      body: JSON.stringify({ name, text }),
    });
  },

  async isBackendHealthy(opts?: { timeoutMs?: number }): Promise<boolean> {
    const timeoutMs = opts?.timeoutMs ?? 2500;
    try {
      const res = await fetch(`${baseUrl()}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
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

  cancelBackendAnalysis(analysisId: number): Promise<BackendAnalysis> {
    return request<BackendAnalysis>(`/analysis/${analysisId}/cancel`, {
      method: "POST",
    });
  },

  finalizeMaterial(materialId: number): Promise<FinalizeResponse> {
    return request<FinalizeResponse>(`/materials/${materialId}/finalize`, {
      method: "POST",
    });
  },

  listFinalizedDocuments(materialId: number): Promise<FinalizedDocument[]> {
    return request<FinalizedDocument[]>(
      `/materials/${materialId}/finalized-documents`,
    );
  },

  finalizedDownloadHref(downloadPath: string): string {
    // download_url del backend es relativo, ej. /materials/1/finalized-documents/2/download
    return `${baseUrl()}${downloadPath}`;
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
    const detail = await request<BackendBarrierDetail>(
      `/barriers/${encodeURIComponent(barrierId)}`,
    );
    return withBackendProposal(barrierFromDetail(detail, analysisId), proposal);
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
          toUserFacingErrorMessage(
            analysis.error_message ??
              "El análisis falló y no hay barreras para revisar.",
            {
              fallback: "El análisis falló y no hay barreras para revisar.",
            },
          ),
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
