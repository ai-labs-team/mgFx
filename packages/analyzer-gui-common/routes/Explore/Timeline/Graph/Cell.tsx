import React from 'react';

import classNames from 'classnames';

import { OptimizedCell } from './renderer';
import { TimeScale } from './hooks/useTransformedTimeScale';
import { RowScale } from './hooks/useTransformedRowScale';

export type Props = {
  rowNumber: number;
  cell: OptimizedCell;
  timeScale: TimeScale;
  rowScale: RowScale;
  selectedId?: string;
  onSelect: (selectedId: string | undefined) => void;
};

export const Cell: React.FC<Props> = ({
  rowNumber: row,
  cell: [[id, parentId, name, state, start, end], coalesceCount, coalesceEnd],
  timeScale,
  rowScale,
  selectedId,
  onSelect,
}) => {
  const [xMin, xMax] = timeScale.range();

  const x1 = Math.max(0, timeScale(start));
  const x2 = Math.min(
    xMax,
    timeScale(
      coalesceCount > 0 ? coalesceEnd : end === undefined ? Date.now() : end
    )
  );

  const y1 = rowScale(row) + 2;
  const y2 = rowScale(row + 1) - 2;

  const width = Math.max(1, x2 - x1);
  const height = Math.max(0, y2 - y1);

  const onClick = React.useCallback<React.MouseEventHandler>(
    (event) => {
      onSelect(id);
      event.stopPropagation();
      event.preventDefault();
    },
    [id, onSelect]
  );

  return (
    <g
      className={classNames('span', state, { selected: id === selectedId })}
      onClick={onClick}
    >
      <rect className="cell" x={x1} y={y1} width={width} height={height} />
      <clipPath id={id}>
        <rect x={x1} y={y1} width={width} height={height} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <text className="label" x={x1 + 2} y={y2}>
          {name}
        </text>
      </g>
    </g>
  );
};
