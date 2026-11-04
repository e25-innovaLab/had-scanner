import { ADAPTATION_TYPE } from './adaptation';

export const SEVERITY_LEVEL = {
  CORRECT: 'correct',
  TO_REVIEW: 'to_review',
  BARRIER: 'barrier',
} as const;

export type SeverityLevel = (typeof SEVERITY_LEVEL)[keyof typeof SEVERITY_LEVEL];

export type AiSeverityLevel = Exclude<SeverityLevel, typeof SEVERITY_LEVEL.BARRIER>;

export const DIMENSION = {
  COMPREHENSION: 'comprehension',
  STRUCTURE: 'structure',
  VISUAL: 'visual',
  ALTERNATIVES: 'alternatives',
  MULTIMEDIA: 'multimedia',
  NAVIGATION: 'navigation',
} as const;

export type Dimension = (typeof DIMENSION)[keyof typeof DIMENSION];

export const FINDING_SOURCE = {
  RULE: 'rule',
  AI: 'ai',
  HYBRID: 'hybrid',
} as const;

export type FindingSource = (typeof FINDING_SOURCE)[keyof typeof FINDING_SOURCE];

export const FINDING_ACTION = {
  ...ADAPTATION_TYPE,
  MANUAL: 'manual',
} as const;

export type FindingAction = (typeof FINDING_ACTION)[keyof typeof FINDING_ACTION];

export const ANALYSIS_STATUS = {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  NOT_ANALYZABLE: 'not_analyzable',
} as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUS)[keyof typeof ANALYSIS_STATUS];

export interface FindingLocation {
  page?: number;
  paragraph?: number;
  range?: [number, number];
}

export interface EvaluationEvidence {
  measuredValue: string | number;
  threshold: string | number;
}

export interface NonEvaluableCriterion {
  criterionId: string;
  dimension: Dimension;
  reason: string;
}

interface FindingBase {
  id: string;
  criterionId: string;
  dimension: Dimension;
  fragment: string;
  explanation: string;
  recommendation: string;
  action: FindingAction;
  location?: FindingLocation;
  evidence?: EvaluationEvidence;
}

export interface RuleFinding extends FindingBase {
  source: typeof FINDING_SOURCE.RULE;
  severity: SeverityLevel;
}

export interface HybridFinding extends FindingBase {
  source: typeof FINDING_SOURCE.HYBRID;
  severity: SeverityLevel;
}

export interface AiFinding extends FindingBase {
  source: typeof FINDING_SOURCE.AI;
  severity: AiSeverityLevel;
}

export type Finding = RuleFinding | HybridFinding | AiFinding;

export interface DimensionResult {
  dimension: Dimension;
  score?: number;
  findingsCount: number;
  evaluatedCriteria: number;
  totalCriteria: number;
}

export interface Diagnosis {
  documentId: string;
  status: AnalysisStatus;
  score?: number;
  evaluatedCriteria: number;
  totalCriteria: number;
  dimensions: DimensionResult[];
  findings: Finding[];
  nonEvaluableCriteria: NonEvaluableCriterion[];
}
