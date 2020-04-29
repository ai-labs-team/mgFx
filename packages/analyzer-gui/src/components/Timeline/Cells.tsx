import React from 'react';

import { Span } from '@mgfx/analyzer';
import classNames from 'classnames';

import { TimeScale } from './hooks/useTransformedTimeScale';
import { RowScale } from './hooks/useTransformedRowScale';
import { useOptimizedLayout } from './hooks/useOptimizedLayout';

import { Cell } from './Cell';

type Props = {
  spans: Span[];
  timeScale: TimeScale;
  rowScale: RowScale;
  selectedId?: string;
  onSelect: (selectedId: string | undefined) => void;
};

export const Cells: React.FC<Props> = ({
  spans,
  timeScale,
  rowScale,
  selectedId,
  onSelect,
}) => {
  const { layout, metrics } = useOptimizedLayout({
    spans,
    timeScale,
    rowScale,
  });

  const items = React.useMemo(
    () =>
      layout.flatMap(([rowNumber, cells]) =>
        cells.map((cell) => (
          <Cell
            key={cell[0][0]}
            {...{ rowNumber, cell, timeScale, rowScale, selectedId, onSelect }}
          />
        ))
      ),
    [layout, timeScale, rowScale, selectedId, onSelect]
  );

  return (
    <>
      <g className={classNames('cells', { 'has-selection': !!selectedId })}>
        {items}
      </g>
      <text className="metrics" y={4}>
        <tspan x={4} dy={12}>
          Spans: {metrics.render.spans.toLocaleString()}
        </tspan>
        <tspan x={4} dy={12}>
          Render: {metrics.render.time.toFixed(2)}ms
        </tspan>
        <tspan x={4} dy={12}>
          Optimize: {metrics.optimize.time.toFixed(2)}ms
        </tspan>
        <tspan x={4} dy={12}>
          Cells: {items.length.toLocaleString()}
        </tspan>
      </text>
    </>
  );
};
