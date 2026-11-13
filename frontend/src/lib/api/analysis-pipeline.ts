/** Shared analysis checklist stages (API real + mock). */

export const ANALYSIS_PIPELINE = [
  { id: "queued", label: "Preparando" },
  { id: "parsing", label: "Revisando el material" },
  { id: "accessibility_analysis", label: "Detectando barreras" },
  { id: "associating_evidence", label: "Ubicando las barreras en el material" },
  { id: "persisting_results", label: "Guardando el diagnóstico" },
] as const;

export type AnalysisPipelineStepId = (typeof ANALYSIS_PIPELINE)[number]["id"];
