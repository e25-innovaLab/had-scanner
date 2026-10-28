'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
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

export function HomeStart() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<FlowResume | null>(() =>
    readFlowResume()
  );
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

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

  function startWithSource(source: VeraSource) {
    if (source === VERA_SOURCE.api && !backendUp) return;
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

  return (
    <div className="space-y-4">
      {resume && continueHref ? (
        <Card className="ring-1 ring-primary/25">
          <CardHeader>
            <CardTitle className="text-primary">Continuar análisis</CardTitle>
            <CardDescription>
              Hay un trabajo guardado en este navegador. Último paso:{' '}
              <span className="font-medium text-foreground">
                {resumeStepLabel(resume.path)}
              </span>
              . No requiere cuenta; solo queda en este dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-10 px-4"
              nativeButton={false}
              render={<Link to={continueHref} />}
            >
              Continuar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={() => {
                clearFlowResume();
                setResume(null);
              }}
            >
              Descartar y elegir camino
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">+ Nuevo análisis</CardTitle>
          <CardDescription>
            Elegí el origen de datos para este recorrido. No se puede cambiar a
            mitad del flujo; para cambiar, volvé al inicio y empezá de nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            className="h-10 px-4"
            onClick={() => startWithSource(VERA_SOURCE.mock)}
          >
            Demo (mock)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={apiDisabled}
            onClick={() => startWithSource(VERA_SOURCE.api)}
          >
            {apiChecking ? 'API real…' : 'API real'}
          </Button>
        </CardContent>
        <CardContent className="pt-0">
          <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Demo:</span> flujo
              completo con la API simulada (texto o archivo).
            </li>
            <li>
              <span className="font-medium text-foreground">API real:</span> PDF
              vía FastAPI (upload + análisis async). Requiere backend local.
              {backendUp === false ? (
                <>
                  {' '}
                  <span className="text-danger-foreground">
                    Backend no disponible ahora (`/health`).
                  </span>
                </>
              ) : null}
              {apiChecking ? <> Comprobando backend…</> : null}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
