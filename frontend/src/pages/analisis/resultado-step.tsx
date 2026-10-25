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
import type { ExportFile } from '@/lib/api/types';
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
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    accepted: 0,
    discarded: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
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
      try {
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
    navigate('/');
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
        <Card className="bg-muted/50">
          <CardHeader className="gap-1.5">
            <CardTitle>Proceso completado</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              {summary.accepted} adaptaciones aplicadas · {summary.discarded}{' '}
              descartadas · {resolved} barreras resueltas de {summary.total} ·
              el original permanece intacto
            </p>
          </CardHeader>
        </Card>

        <DownloadList files={files} />

        <Card>
          <CardHeader>
            <CardTitle>Registro de cambios aplicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applied.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay adaptaciones aceptadas.
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
                Descartadas (quedan registradas en el informe):{' '}
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
            'h-10 px-4'
          )}
        >
          Atrás
        </Link>
        <Button
          type="button"
          size="lg"
          className="h-10 px-4"
          onClick={() => setConfirmOpen(true)}
        >
          Finalizar
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>¿Ya descargaste tus archivos?</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Estás usando VERA sin cuenta: al finalizar se borran el material
              adaptado y el informe. Si todavía no los descargaste, volvé y
              descargalos antes de salir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={() => setConfirmOpen(false)}
            >
              Volver a descargar
            </Button>
            <Button
              type="button"
              className="h-10 px-4"
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
