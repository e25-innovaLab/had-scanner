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
import { DEFAULT_VERA_SOURCE, writeVeraSource } from '@/lib/api/vera-source';
import { cn } from '@/lib/utils';

const CONNECTION_SEGMENTS = 8;

function ConnectionProgress({ filled }: { filled: number }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={CONNECTION_SEGMENTS}
      aria-valuenow={filled}
      aria-label="Conectando con Vera"
    >
      {Array.from({ length: CONNECTION_SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-300',
            index < filled ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}

export function HomeStart() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<FlowResume | null>(() =>
    readFlowResume()
  );
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [connectionFilled, setConnectionFilled] = useState(0);

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

  useEffect(() => {
    if (backendUp === true) {
      setConnectionFilled(CONNECTION_SEGMENTS);
      return;
    }
    if (backendUp === false) {
      return;
    }

    setConnectionFilled(1);
    const timer = window.setInterval(() => {
      setConnectionFilled((current) =>
        current >= CONNECTION_SEGMENTS - 1 ? current : current + 1
      );
    }, 450);

    return () => {
      window.clearInterval(timer);
    };
  }, [backendUp]);

  function startAnalysis() {
    if (backendUp !== true) return;
    clearFlowResume();
    setResume(null);
    writeVeraSource(DEFAULT_VERA_SOURCE);
    navigate('/analisis/cargar');
  }

  const continueHref = resume
    ? withAnalysisId(resume.path, resume.analysisId)
    : null;
  const apiDisabled = backendUp !== true;
  const apiChecking = backendUp === null;

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
            Subí un PDF para analizarlo con Vera.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiChecking ? (
            <div className="space-y-2">
              <ConnectionProgress filled={connectionFilled} />
              <p className="text-xs leading-5 text-muted-foreground">
                Preparando Vera…
              </p>
            </div>
          ) : null}
          {backendUp === false ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Vera no está disponible por ahora. Probá de nuevo en unos
              minutos.
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-xl px-5 font-semibold"
            disabled={apiDisabled}
            onClick={startAnalysis}
          >
            Comenzar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
