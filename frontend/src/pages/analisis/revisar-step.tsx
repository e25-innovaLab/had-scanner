'use client';

import { useCallback, useState } from 'react';
import {
  BarrierList,
  type BarrierStats,
} from '@/components/aula/barrier-list';
import { AnalysisFlowFooter } from '@/components/aula/analysis-flow-footer';
import { Card, CardContent } from '@/components/ui/card';

const EMPTY_STATS: BarrierStats = {
  total: 0,
  highSeverity: 0,
  dimensionsAffected: 0,
  dimensionsTotal: 6,
  byDimension: [],
  highByDimension: [],
  clearDimensionNames: [],
};

function formatBreakdown(
  rows: { name: string; count: number }[],
  shortNames = false
) {
  if (rows.length === 0) return null;
  return rows
    .map((row) => {
      const name = shortNames ? shortenDimension(row.name) : row.name;
      return `${name} ${row.count}`;
    })
    .join(' · ');
}

function shortenDimension(name: string) {
  if (name === 'Accesibilidad visual') return 'Acc. visual';
  if (name === 'Alt. de representación') return 'Alt. repr.';
  if (name === 'Contenido multimedia') return 'Multimedia';
  return name;
}

export function RevisarStep() {
  const [stats, setStats] = useState<BarrierStats>(EMPTY_STATS);

  const onStats = useCallback((next: BarrierStats) => {
    setStats(next);
  }, []);

  const totalDetail = formatBreakdown(stats.byDimension, true);
  const highDetail = formatBreakdown(stats.highByDimension);
  const clearDetail =
    stats.clearDimensionNames.length > 0
      ? `${stats.clearDimensionNames.map(shortenDimension).join(' y ')} sin barreras`
      : null;

  const cards = [
    {
      value: String(stats.total),
      label: 'Barreras totales',
      detail: totalDetail,
    },
    {
      value: String(stats.highSeverity),
      label: 'Prioridad alta',
      detail: highDetail,
    },
    {
      value: `${stats.dimensionsAffected}/${stats.dimensionsTotal}`,
      label: 'Dimensiones afectadas',
      detail: clearDetail,
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {cards.map((stat) => (
          <Card key={stat.label} className="text-center">
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight text-primary">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.detail ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  {stat.detail}
                </p>
              ) : null}
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
