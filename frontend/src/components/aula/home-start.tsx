'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api/client';
import {
  clearFlowResume,
  readFlowResume,
  resumeStepLabel,
  withAnalysisId,
  type FlowResume,
} from '@/lib/api/url';
import {
  VERA_SOURCE,
  writeVeraSource,
  type VeraSource,
} from '@/lib/api/vera-source';
import { cn } from '@/lib/utils';

export function HomeStart() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<FlowResume | null>(() =>
    readFlowResume()
  );
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [source, setSource] = useState<VeraSource>(VERA_SOURCE.mock);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await api.isBackendHealthy();
      if (!cancelled) setBackendUp(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startAnalysis() {
    if (source === VERA_SOURCE.api && backendUp !== true) return;
    clearFlowResume();
    setResume(null);
    writeVeraSource(source);
    navigate('/analisis/cargar');
  }

  const continueHref = resume
    ? withAnalysisId(resume.path, resume.analysisId)
    : null;
  const apiDisabled = backendUp !== true;
  const apiChecking = backendUp === null;
  const canStart =
    source === VERA_SOURCE.mock || (source === VERA_SOURCE.api && !apiDisabled);

  return (
    <div className="space-y-4">
      {resume && continueHref ? (
        <Card className="shadow-sm ring-1 ring-primary/30">
          <CardHeader>
            <CardTitle>Continuar análisis</CardTitle>
            <CardDescription>
              Hay un trabajo guardado en este navegador. Último paso:{' '}
              <span className="font-medium text-foreground">
                {resumeStepLabel(resume.path)}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-10 rounded-xl px-4 font-semibold"
              nativeButton={false}
              render={<Link to={continueHref} />}
            >
              Continuar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-4"
              onClick={() => {
                clearFlowResume();
                setResume(null);
              }}
            >
              Descartar y empezar de nuevo
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm ring-1 ring-border/70">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            Nuevo análisis
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            {source === VERA_SOURCE.api
              ? 'Subí un PDF para analizarlo con el backend local.'
              : 'Subí un PDF, Word, PowerPoint o pegá texto directamente para empezar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setSource(VERA_SOURCE.mock)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                source === VERA_SOURCE.mock
                  ? 'border-ink bg-ink text-sidebar-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              Demo (mock)
            </button>
            <button
              type="button"
              disabled={apiDisabled}
              onClick={() => setSource(VERA_SOURCE.api)}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
                source === VERA_SOURCE.api
                  ? 'border-ink bg-ink text-sidebar-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {apiChecking ? 'API real…' : 'API real'}
            </button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {source === VERA_SOURCE.mock
              ? 'Demo: flujo completo con la API simulada (texto o archivo).'
              : backendUp === false
                ? 'Backend no disponible ahora (`/health`).'
                : 'API real: PDF vía FastAPI. Requiere backend local.'}
          </p>
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-xl px-5 font-semibold"
            disabled={!canStart}
            onClick={startAnalysis}
          >
            Comenzar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
