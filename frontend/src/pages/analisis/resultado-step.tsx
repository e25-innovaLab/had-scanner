'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DownloadList } from '@/components/aula/download-list';
import { MissingAnalysis } from '@/components/aula/missing-analysis';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api/client';
import { isBackendId } from '@/lib/api/ids';
import type { ExportFile } from '@/lib/api/types';
import { isBackendId } from '@/lib/api/ids';
import {
  clearFlowResume,
  resolveAnalysisId,
  withAnalysisId,
} from '@/lib/api/url';
import { cn } from '@/lib/utils';

export function ResultadoStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));
  const usesBackendApi = Boolean(analysisId && isBackendId(analysisId));
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    accepted: 0,
    discarded: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [exportUnavailable, setExportUnavailable] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(analysisId));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prevAnalysisId, setPrevAnalysisId] = useState(analysisId);

  if (analysisId !== prevAnalysisId) {
    setPrevAnalysisId(analysisId);
    setLoading(Boolean(analysisId));
  }

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    void (async () => {
      setExportUnavailable(false);
      try {
        if (isBackendId(analysisId)) {
          const { barriers } = await api.listBarriersFlat(analysisId);
          if (cancelled) return;
          const accepted = barriers.filter(
            (barrier) => barrier.status === 'accepted'
          );
          const rejected = barriers.filter(
            (barrier) => barrier.status === 'discarded'
          );
          setApplied(
            accepted.map((barrier) =>
              `${barrier.title}: ${barrier.currentProposal ?? ''}`.trim()
            )
          );
          setDiscarded(rejected.map((barrier) => barrier.title));
          setSummary({
            accepted: accepted.length,
            discarded: rejected.length,
            total: barriers.length,
          });
          setFiles([]);
          setExportUnavailable(true);
          setError(null);
          return;
        }

        await api.export(analysisId);
        const data = await api.getExports(analysisId);
        if (cancelled) return;
        setFiles(data.exports);
        setApplied(data.appliedChanges);
        setDiscarded(data.discardedChanges);
        setSummary(data.summary);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al exportar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  function finishAndLeave() {
    clearFlowResume();
    setConfirmOpen(false);
    navigate('/inicio');
  }

  if (!analysisId) {
    return <MissingAnalysis step="obtener el resultado" />;
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Preparando exportaciones...
      </p>
    );
  }

  const resolved = summary.accepted + summary.discarded;

  return (
    <>
      {error ? (
        <p className="mb-4 text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        <Card className="border-transparent bg-tertiary-container shadow-none ring-1 ring-primary/25">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-base">
                {usesBackendApi
                  ? 'Revisión de propuestas completada'
                  : 'Proceso completado'}
              </CardTitle>
              <p className="text-sm leading-6 text-foreground/80">
                {usesBackendApi
                  ? `${summary.accepted} propuestas aceptadas · ${summary.discarded} rechazadas · ${resolved} barreras revisadas de ${summary.total}. El backend conserva el material original.`
                  : `${summary.accepted} adaptaciones aplicadas · ${summary.discarded} descartadas · ${resolved} barreras resueltas de ${summary.total} · el original permanece intacto`}
              </p>
            </div>
            {!exportUnavailable ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                <span className="size-1.5 rounded-full bg-primary-foreground" />
                Listo para descarga
              </span>
            ) : null}
          </CardHeader>
        </Card>

        {exportUnavailable ? (
          <Card className="px-4 py-4 text-sm text-muted-foreground">
            El backend todavía no ofrece generación ni descarga de archivos.
            Las decisiones de las propuestas sí quedaron guardadas.
          </Card>
        ) : (
          <DownloadList files={files} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {usesBackendApi
                ? 'Registro de decisiones'
                : 'Registro de cambios aplicados'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applied.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {usesBackendApi
                  ? 'Todavía no hay propuestas aceptadas.'
                  : 'Todavía no hay adaptaciones aceptadas.'}
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
                {applied.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
            {discarded.length > 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {usesBackendApi
                  ? 'Rechazadas: '
                  : 'Descartadas (quedan registradas en el informe): '}
                {discarded.join(' · ')}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={withAnalysisId('/analisis/adaptar', analysisId)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'h-11 rounded-xl px-4'
          )}
        >
          Atrás
        </Link>
        <Button
          type="button"
          size="lg"
          className="h-11 rounded-xl px-4 font-semibold"
          onClick={() => setConfirmOpen(true)}
        >
          Finalizar
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="gap-5 rounded-2xl sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl">
              {usesBackendApi
                ? '¿Finalizar el recorrido?'
                : '¿Ya descargaste tus archivos?'}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              {usesBackendApi
                ? 'Vas a volver al inicio. Las propuestas y decisiones permanecen guardadas en el backend.'
                : 'Estás usando VERA sin cuenta: al finalizar se borran el material adaptado y el informe. Si todavía no los descargaste, volvé y descargalos antes de salir.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={() => setConfirmOpen(false)}
            >
              {usesBackendApi ? 'Volver al resumen' : 'Volver a descargar'}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl px-4 font-semibold"
              onClick={finishAndLeave}
            >
              Finalizar y salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
