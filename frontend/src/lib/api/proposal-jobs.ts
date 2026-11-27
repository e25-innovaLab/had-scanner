import { useSyncExternalStore } from 'react';
import { api, ApiError } from '@/lib/api/client';
import { isBackendId } from '@/lib/api/ids';
import { proposalGenerationMessage } from '@/lib/api/proposal-errors';
import type { ApiBarrier } from '@/lib/api/types';

const DEMO_PROPOSAL_JOB_DELAY_MS = 4000;

export const PROPOSAL_JOB_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ProposalJobStatus =
  (typeof PROPOSAL_JOB_STATUS)[keyof typeof PROPOSAL_JOB_STATUS];

export type ProposalJob = {
  analysisId: string;
  barrierId: string;
  barrierTitle: string;
  dimensionId: string;
  status: ProposalJobStatus;
  barrier: ApiBarrier | null;
  error: string | null;
  variant: keyof ApiBarrier['variants'] | null;
};

export type StartProposalOptions = {
  variant?: keyof ApiBarrier['variants'];
  barrierTitle?: string;
  dimensionId?: string;
};

type InternalJob = ProposalJob & {
  abortController: AbortController | null;
};

const jobs = new Map<string, InternalJob>();
const listeners = new Set<() => void>();

let jobsSnapshot: ProposalJob[] = [];
let pendingSnapshot: ProposalJob[] = [];

function toPublicJob(job: InternalJob): ProposalJob {
  return {
    analysisId: job.analysisId,
    barrierId: job.barrierId,
    barrierTitle: job.barrierTitle,
    dimensionId: job.dimensionId,
    status: job.status,
    barrier: job.barrier,
    error: job.error,
    variant: job.variant,
  };
}

function rebuildSnapshots() {
  jobsSnapshot = Array.from(jobs.values()).map(toPublicJob);
  pendingSnapshot = jobsSnapshot.filter(
    (job) => job.status === PROPOSAL_JOB_STATUS.PENDING
  );
}

function emit() {
  rebuildSnapshots();
  listeners.forEach((listener) => listener());
}

export function proposalJobKey(analysisId: string, barrierId: string) {
  return `${analysisId}:${barrierId}`;
}

export function subscribeProposalJobs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProposalJobsSnapshot() {
  return jobsSnapshot;
}

export function getPendingProposalJobsSnapshot() {
  return pendingSnapshot;
}

export function getProposalJob(analysisId: string, barrierId: string) {
  const job = jobs.get(proposalJobKey(analysisId, barrierId));
  return job ? toPublicJob(job) : null;
}

export function clearProposalJob(analysisId: string, barrierId: string) {
  const key = proposalJobKey(analysisId, barrierId);
  const existing = jobs.get(key);
  if (!existing) return;
  existing.abortController?.abort();
  jobs.delete(key);
  emit();
}

export function cancelProposal(analysisId: string, barrierId: string) {
  const key = proposalJobKey(analysisId, barrierId);
  const existing = jobs.get(key);
  if (!existing || existing.status !== PROPOSAL_JOB_STATUS.PENDING) {
    return;
  }

  existing.abortController?.abort();
  jobs.delete(key);
  emit();

  if (isBackendId(analysisId) && isBackendId(barrierId)) {
    void api.cancelProposalGeneration(Number(barrierId)).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return;
      console.warn('No se pudo cancelar la generación en el servidor', err);
    });
  }
}

export function startProposal(
  analysisId: string,
  barrierId: string,
  options: StartProposalOptions = {}
) {
  const key = proposalJobKey(analysisId, barrierId);
  const existing = jobs.get(key);
  if (existing?.status === PROPOSAL_JOB_STATUS.PENDING) {
    return;
  }

  const previous = existing;
  const abortController = new AbortController();
  jobs.set(key, {
    analysisId,
    barrierId,
    barrierTitle: options.barrierTitle ?? previous?.barrierTitle ?? '',
    dimensionId: options.dimensionId ?? previous?.dimensionId ?? '',
    status: PROPOSAL_JOB_STATUS.PENDING,
    barrier: null,
    error: null,
    variant: options.variant ?? null,
    abortController,
  });
  emit();

  const body = options.variant ? { variant: options.variant } : undefined;

  void (async () => {
    try {
      if (!isBackendId(analysisId) && DEMO_PROPOSAL_JOB_DELAY_MS > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(resolve, DEMO_PROPOSAL_JOB_DELAY_MS);
          abortController.signal.addEventListener(
            'abort',
            () => {
              window.clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true }
          );
        });
      }
      const { barrier } = await api.createProposal(
        analysisId,
        barrierId,
        body,
        { signal: abortController.signal }
      );
      const current = jobs.get(key);
      if (!current || current.status !== PROPOSAL_JOB_STATUS.PENDING) {
        return;
      }
      jobs.set(key, {
        ...current,
        status: PROPOSAL_JOB_STATUS.SUCCESS,
        barrier,
        error: null,
        abortController: null,
      });
      emit();
    } catch (err) {
      const current = jobs.get(key);
      if (!current || current.status !== PROPOSAL_JOB_STATUS.PENDING) {
        return;
      }
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof ApiError && err.status === 409)
      ) {
        jobs.delete(key);
        emit();
        return;
      }
      jobs.set(key, {
        ...current,
        status: PROPOSAL_JOB_STATUS.ERROR,
        barrier: null,
        error: proposalGenerationMessage(err),
        abortController: null,
      });
      emit();
    }
  })();
}

function getServerSnapshot() {
  return emptyJobs;
}

const emptyJobs: ProposalJob[] = [];

export function useProposalJobs() {
  return useSyncExternalStore(
    subscribeProposalJobs,
    getProposalJobsSnapshot,
    getServerSnapshot
  );
}

export function usePendingProposalJobs() {
  return useSyncExternalStore(
    subscribeProposalJobs,
    getPendingProposalJobsSnapshot,
    getServerSnapshot
  );
}

export function useProposalJob(
  analysisId: string | null | undefined,
  barrierId: string | null | undefined
) {
  const jobsList = useProposalJobs();
  if (!analysisId || !barrierId) return null;
  return (
    jobsList.find(
      (job) => job.analysisId === analysisId && job.barrierId === barrierId
    ) ?? null
  );
}
