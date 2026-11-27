'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  clearFlowResume,
  readFlowResume,
  resumeStepLabel,
  withAnalysisId,
  type FlowResume,
} from '@/lib/api/url';
import { DEFAULT_VERA_SOURCE, writeVeraSource } from '@/lib/api/vera-source';
import { cn } from '@/lib/utils';

function ConnectionProgress({
  filled,
  segments,
}: {
  filled: number;
  segments: number;
}) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={segments}
      aria-valuenow={filled}
      aria-label="Conectando con Vera"
    >
      {Array.from({ length: segments }, (_, index) => (
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

export function HomeStart({
  backendUp,
  connectionFilled,
  connectionSegments,
}: {
  backendUp: boolean | null;
  connectionFilled: number;
  connectionSegments: number;
}) {
  const navigate = useNavigate();
  const [resume, setResume] = useState<FlowResume | null>(() =>
    readFlowResume()
  );

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
    <div className="flex w-full flex-col gap-6">
      {resume && continueHref ? (
        <Card className="border-primary/30 shadow-none">
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
              className="rounded-[12px] font-semibold"
              nativeButton={false}
              render={<Link to={continueHref} />}
            >
              Continuar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-[12px]"
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

      <Card className="shadow-none">
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
              <ConnectionProgress
                filled={connectionFilled}
                segments={connectionSegments}
              />
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
            className="rounded-[12px] font-semibold"
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
