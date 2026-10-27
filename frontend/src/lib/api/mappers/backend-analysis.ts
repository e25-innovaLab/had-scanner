import { AI_ATTEMPTS_PER_BARRIER, DIMENSIONS } from "@/lib/aula";
import type {
  ApiBarrier,
  BackendAnalysis,
  BackendBarrier,
  BarriersResponse,
  BarrierGroupDto,
  DimensionProgress,
  Severity,
} from "@/lib/api/types";

const TYPE_TO_DIMENSION: Record<string, (typeof DIMENSIONS)[number]> = {
    comprension: "Comprensión",
    comprensión: "Comprensión",
    estructura: "Estructura",
    "accesibilidad visual": "Accesibilidad visual",
    visual: "Accesibilidad visual",
    "alt. de representación": "Alt. de representación",
    "contenido multimedia": "Contenido multimedia",
    multimedia: "Contenido multimedia",
    navegacion: "Navegación",
    navegación: "Navegación",
  };
  
  const SEVERITY_MAP: Record<string, Exclude<Severity, "ninguna">> = {
    high: "alta",
    alta: "alta",
    medium: "media",
    media: "media",
    low: "baja",
    baja: "baja",
  };

  function dimensionLabel(type: string): (typeof DIMENSIONS)[number] {
    const key = type.trim().toLowerCase();
    return TYPE_TO_DIMENSION[key] ?? "Comprensión";
  }
  
  function dimensionIdFromLabel(label: string): string {
    const map: Record<string, string> = {
      Comprensión: "comprension",
      Estructura: "estructura",
      "Accesibilidad visual": "visual",
      "Alt. de representación": "representacion",
      "Contenido multimedia": "multimedia",
      Navegación: "navegacion",
    };
    return map[label] ?? "comprension";
  }
  
  function mapSeverity(raw: string): Exclude<Severity, "ninguna"> {
    return SEVERITY_MAP[raw.trim().toLowerCase()] ?? "media";
  }
  
  function formatWhere(b: BackendBarrier): string {
    const pages = b.location?.pages?.length
      ? `Pág. ${b.location.pages.join(", ")}`
      : "";
    const anchors = b.evidences
      .map((e) => e.anchor)
      .filter(Boolean)
      .slice(0, 2);
    const anchorPart = anchors.length ? anchors.join(" · ") : "";
    if (pages && anchorPart) return `${pages} — ${anchorPart}`;
    return pages || anchorPart || "Ubicación no especificada";
  }
  
  function emptyVariants(recommendation: string) {
    return {
      simple: recommendation,
      breve: recommendation,
      pasos: recommendation,
      ejemplo: recommendation,
      otra: recommendation,
    };
  }

  export function toApiBarrier(
    b: BackendBarrier,
    analysisId: string,
  ): ApiBarrier {
    const dimension = dimensionLabel(b.type);
    const dimensionId = dimensionIdFromLabel(dimension);
    const where = formatWhere(b);
    const why = b.justification || b.description;
    const severity = mapSeverity(b.severity);
  
    return {
      id: String(b.id),
      analysisId,
      dimensionId,
      dimension,
      severity,
      title: b.title,
      why,
      where,
      recommendation: b.recommendation,
      status:
        b.status === "accepted" || b.status === "discarded"
          ? b.status
          : "pending",
      remainingAttempts: AI_ATTEMPTS_PER_BARRIER,
      hasProposal: false,
      draft: null,
      currentProposal: null,
      criterion: dimension,
      detected: b.description,
      original: b.evidences[0]?.anchor ?? `(Fragmento en ${where})`,
      location: where,
      proposes: b.recommendation,
      variants: emptyVariants(b.recommendation),
    };
  }

  export function toBarriersResponse(
    analysis: BackendAnalysis,
  ): BarriersResponse {
    const analysisId = String(analysis.analysis_id);
    const apiBarriers = analysis.barriers.map((b) =>
      toApiBarrier(b, analysisId),
    );
  
    const byDim = new Map<string, typeof apiBarriers>();
    for (const item of apiBarriers) {
      const list = byDim.get(item.dimensionId) ?? [];
      list.push(item);
      byDim.set(item.dimensionId, list);
    }
  
    const groups: BarrierGroupDto[] = DIMENSIONS.map((name) => {
      const id = dimensionIdFromLabel(name);
      const items = (byDim.get(id) ?? []).map((b) => ({
        id: b.id,
        title: b.title,
        why: b.why,
        where: b.where,
        recommendation: b.recommendation,
        status: b.status,
        severity: b.severity,
      }));
      const worst =
        items.some((i) => i.severity === "alta")
          ? "alta"
          : items.some((i) => i.severity === "media")
            ? "media"
            : items.length
              ? "baja"
              : "ninguna";
      return {
        id,
        name,
        count: items.length,
        severity: worst as BarrierGroupDto["severity"],
        items,
      };
    });
  
    const withItems = groups.filter((g) => g.count > 0);
    const clear = groups.filter((g) => g.count === 0).map((g) => g.name);
  
    return {
      groups,
      stats: {
        total: apiBarriers.length,
        highSeverity: apiBarriers.filter((b) => b.severity === "alta").length,
        dimensionsAffected: withItems.length,
        dimensionsTotal: DIMENSIONS.length,
        byDimension: withItems.map((g) => ({
          id: g.id,
          name: g.name,
          count: g.count,
        })),
        highByDimension: withItems
          .map((g) => ({
            id: g.id,
            name: g.name,
            count: g.items.filter((i) => i.severity === "alta").length,
          }))
          .filter((x) => x.count > 0),
        clearDimensionNames: clear,
      },
    };
  }

  export function toDimensionProgress(
    _analysis: BackendAnalysis,
  ): DimensionProgress[] {
    return DIMENSIONS.map((label) => ({
      id: dimensionIdFromLabel(label),
      label,
      status: "done" as const,
    }));
  }
  
  export function toReadyStatus(analysis: BackendAnalysis, fileName: string) {
    return {
      id: String(analysis.analysis_id),
      status: "ready" as const,
      originalFileName: fileName || `material-${analysis.material_id}.pdf`,
      originalFileSize: 0,
      dimensionProgress: toDimensionProgress(analysis),
    };
  }
