'use client';

import { useState } from 'react';
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
import {
  clearFlowResume,
  readFlowResume,
  resumeStepLabel,
  withAnalysisId,
  type FlowResume,
} from '@/lib/api/url';

export function HomeStart() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<FlowResume | null>(() =>
    readFlowResume()
  );

  function startFresh() {
    clearFlowResume();
    setResume(null);
    navigate('/analisis/cargar');
  }

  const continueHref = resume
    ? withAnalysisId(resume.path, resume.analysisId)
    : null;

  return (
    <div className="space-y-4">
      {resume && continueHref ? (
        <Card className="ring-1 ring-primary/20">
          <CardHeader>
            <CardTitle>Continuar análisis</CardTitle>
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
              onClick={startFresh}
            >
              Empezar de nuevo
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>+ Nuevo análisis</CardTitle>
          <CardDescription>
            Subí un PDF, Word, PowerPoint o pegá texto directamente para
            empezar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="h-10 px-4" onClick={startFresh}>
            Comenzar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
