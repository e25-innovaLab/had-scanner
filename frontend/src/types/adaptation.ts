export const ADAPTATION_TYPE = {
  PLAIN_LANGUAGE: 'plain_language',
  SPLIT_STEPS: 'split_steps',
  REORGANIZE: 'reorganize',
  ALT_TEXT: 'alt_text',
  HEADING_STRUCTURE: 'heading_structure',
} as const;

export type AdaptationType = (typeof ADAPTATION_TYPE)[keyof typeof ADAPTATION_TYPE];

export const ADAPTATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EDITED: 'edited',
  REJECTED: 'rejected',
} as const;

export type AdaptationStatus = (typeof ADAPTATION_STATUS)[keyof typeof ADAPTATION_STATUS];

export interface Adaptation {
  id: string;
  findingId: string;
  type: AdaptationType;
  status: AdaptationStatus;
  original: string;
  proposed: string;
  finalContent?: string;
}

export interface AdaptationSummary {
  total: number;
  pending: number;
  accepted: number;
  edited: number;
  rejected: number;
}
