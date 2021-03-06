import React from 'react';

import { Span } from '@mgfx/analyzer';
import { Grid } from '@vx/grid';

import { useDimensions } from './Timeline/hooks/useDimensions';
import { useTranslatron } from './Timeline/hooks/useTranslatron';
import {
  useTransformedTimeScale,
  Focus,
} from './Timeline/hooks/useTransformedTimeScale';
import { useTransformedRowScale } from './Timeline/hooks/useTransformedRowScale';

import { TimeAxis } from './Timeline/TimeAxis';
import { CurrentTime } from './Timeline/CurrentTime';
import { Crosshair } from './Timeline/Crosshair';
import { Cells } from './Timeline/Cells';

type Props = {
  spans: Span[];
  initialFocus: Focus;
  onTimeDomainChanged?: (newDomain: TimeDomain) => void;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
};

export const Timeline: React.FC<Props> = ({
  initialFocus,
  spans,
  selectedId,
  onSelect,
}) => {
  const onUnselect = React.useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const { container, dimensions } = useDimensions();

  const { pendingTransform, cursorPosition, eventHandlers } = useTranslatron({
    dimensions,
    onClick: onUnselect,
  });

  const timeScale = useTransformedTimeScale({
    focus: initialFocus,
    pendingTransform,
    dimensions,
  });

  const rowScale = useTransformedRowScale({ pendingTransform, dimensions });

  return (
    <div className="container" ref={container} {...eventHandlers}>
      <svg>
        <clipPath id="clipped-viewport">
          <rect
            x={0}
            y={0}
            width={dimensions.width}
            height={Math.max(0, dimensions.height - TIME_AXIS_OFFSET)}
          />
        </clipPath>
        <g clipPath="url(#clipped-viewport)">
          <MemoizedGrid {...dimensions} xScale={timeScale} yScale={rowScale} />
          <Crosshair {...{ cursorPosition, dimensions, rowScale, timeScale }} />
          <Cells {...{ spans, timeScale, rowScale, selectedId, onSelect }} />
          <CurrentTime
            {...{ dimensions, timeScale }}
            fixed={
              initialFocus.kind === 'now' && initialFocus.following === true
            }
          />
        </g>
        <TimeAxis {...{ dimensions, timeScale }} />
      </svg>
    </div>
  );
};

const MemoizedGrid = React.memo(Grid);

const TIME_AXIS_OFFSET = 50;
export type TimeDomain = readonly [number, number];
