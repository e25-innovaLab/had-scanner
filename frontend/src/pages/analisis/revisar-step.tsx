'use client';

import { useCallback, useState } from 'react';
import { BarrierList } from '@/components/aula/barrier-list';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';
import { Card, CardContent } from '@/components/ui/card';

export function RevisarStep() {
  const [stats, setStats] = useState({
    total: 0,
    highSeverity: 0,
    dimensionsAffected: 0,
    dimensionsTotal: 6,
  });

  const onStats = useCallback(
    (next: {
      total: number;
      highSeverity: number;
      dimensionsAffected: number;
      dimensionsTotal: number;
    }) => {
      setStats(next);
    },
    []
  );

  const cards = [
    { value: String(stats.total), label: 'Barreras totales' },
    {
      value: String(stats.highSeverity),
      label: 'En dimensiones de severidad alta',
    },
    {
      value: `${stats.dimensionsAffected}/${stats.dimensionsTotal}`,
      label: 'Dimensiones afectadas',
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {cards.map((stat) => (
          <Card key={stat.label} className="items-center text-center">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <BarrierList onStats={onStats} />
      <AnalysisFlowFooter
        backHref="/analisis/analizar"
        nextHref="/analisis/adaptar"
        nextLabel="Siguiente: Adaptar"
      />
    </>
  );
}
