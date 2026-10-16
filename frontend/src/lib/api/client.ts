import type {
  Analysis,
  AnalysisStatusResponse,
  ApiBarrier,
  BarriersResponse,
  ExportFile,
  Proposal,
} from "@/lib/api/types"

const DEFAULT_BASE = ""

function baseUrl() {
  const env = import.meta.env.VITE_API_BASE_URL
  if (typeof env === "string" && env.length > 0) {
    return env.replace(/\/$/, "")
  }
  return DEFAULT_BASE
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
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
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error HTTP ${res.status}`
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

export const api = {
  createAnalysis(input: {
    fileName: string
    fileSize: number
  }): Promise<Analysis> {
    return request<Analysis>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  getStatus(analysisId: string): Promise<AnalysisStatusResponse> {
    return request<AnalysisStatusResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/status`
    )
  },

  getAnalysis(analysisId: string): Promise<Analysis> {
    return request<Analysis>(
      `/api/analyses/${encodeURIComponent(analysisId)}`
    )
  },

  listBarriers(analysisId: string): Promise<BarriersResponse> {
    return request<BarriersResponse>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers`
    )
  },

  listBarriersFlat(analysisId: string): Promise<{ barriers: ApiBarrier[] }> {
    return request<{ barriers: ApiBarrier[] }>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers?flat=1`
    )
  },

  getBarrier(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    return request<ApiBarrier>(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}`
    )
  },

  createProposal(
    analysisId: string,
    barrierId: string,
    body?: { variant?: keyof ApiBarrier["variants"] }
  ): Promise<{ barrier: ApiBarrier; proposal: Proposal }> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }
    )
  },

  saveDraft(
    analysisId: string,
    barrierId: string,
    draft: string
  ): Promise<ApiBarrier> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/draft`,
      {
        method: "PUT",
        body: JSON.stringify({ draft }),
      }
    )
  },

  accept(
    analysisId: string,
    barrierId: string,
    draft?: string
  ): Promise<ApiBarrier> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ draft }),
      }
    )
  },

  discard(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/discard`,
      { method: "POST", body: JSON.stringify({}) }
    )
  },

  reopen(analysisId: string, barrierId: string): Promise<ApiBarrier> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/barriers/${encodeURIComponent(barrierId)}/reopen`,
      { method: "POST", body: JSON.stringify({}) }
    )
  },

  export(analysisId: string): Promise<{
    exportStatus: string
    exports: ExportFile[]
  }> {
    return request(`/api/analyses/${encodeURIComponent(analysisId)}/export`, {
      method: "POST",
      body: JSON.stringify({}),
    })
  },

  getExports(analysisId: string): Promise<{
    exportStatus: string
    exports: ExportFile[]
    appliedChanges: string[]
    summary: { accepted: number; discarded: number }
  }> {
    return request(
      `/api/analyses/${encodeURIComponent(analysisId)}/exports`
    )
  },
}
