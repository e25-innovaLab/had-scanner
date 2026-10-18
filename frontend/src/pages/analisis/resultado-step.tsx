'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';
import { DownloadList } from '@/components/aula/download-list';
import { MissingAnalysis } from '@/components/aula/missing-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { ExportFile } from '@/lib/api/types';
import { resolveAnalysisId } from '@/lib/api/url';

export function ResultadoStep() {
  const [searchParams] = useSearchParams();
  const analysisId = resolveAnalysisId(searchParams.get('analysisId'));
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [summary, setSummary] = useState({ accepted: 0, discarded: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(analysisId));
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

  return (
    <>
      {error ? (
        <p className="mb-4 text-sm text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Proceso completado</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.accepted} adaptaciones aplicadas · {summary.discarded}{' '}
              descartadas · el original permanece intacto
            </p>
          </CardHeader>
        </Card>
        <DownloadList files={files} />
        <Card>
          <CardHeader>
            <CardTitle>Registro de cambios aplicados</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
      <AnalysisFlowFooter
        backHref="/analisis/detalle"
        nextHref="/"
        nextLabel="Finalizar"
      />
    </>
  );
}
