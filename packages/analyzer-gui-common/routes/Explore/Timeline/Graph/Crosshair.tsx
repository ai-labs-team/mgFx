import React from 'react';

import { timeFormat } from 'd3-time-format';
import classNames from 'classnames';

import { MaybePoint } from './hooks/useTranslatron';
import { Dimensions } from './hooks/useDimensions';
import { TimeScale } from './hooks/useTransformedTimeScale';
import { RowScale } from './hooks/useTransformedRowScale';

type Props = {
  cursorPosition: MaybePoint;
  dimensions: Dimensions;
  timeScale: TimeScale;
  rowScale: RowScale;
};

export const Crosshair: React.FC<Props> = ({
  cursorPosition,
  timeScale,
  rowScale,
  dimensions: { width, height },
}) => {
  if (!cursorPosition) {
    return null;
  }

  const { x, y } = cursorPosition;
  const row = Math.floor(rowScale.invert(y));
  const time = timeScale.invert(x);
  const label = LABEL_FORMATTER(time);
  const y0 = rowScale(row);
  const y1 = rowScale(row + 1);

  return (
    <g className="crosshair">
      <rect
        className="horizontal"
        x={0}
        y={y0}
        width={width}
        height={y1 - y0}
      />
      <line className="vertical" x1={x} y1={0} x2={x} y2={height} />
      <text
        className={classNames('label', {
          'near-right': x > width - LABEL_MAX_WIDTH,
        })}
        x={x}
        y={height - LABEL_OFFSET_BOTTOM}
      >
        {label}
      </text>
    </g>
  );
};

const LABEL_FORMATTER = timeFormat('%a %d %b %H:%M:%S.%L');
const LABEL_MAX_WIDTH = 180;
const LABEL_OFFSET_BOTTOM = 58;
