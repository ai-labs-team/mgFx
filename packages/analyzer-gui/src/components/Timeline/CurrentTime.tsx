import React from 'react';

import classNames from 'classnames';
import { timeFormat } from 'd3-time-format';

import { TimeScale } from './hooks/useTransformedTimeScale';
import { Dimensions } from './hooks/useDimensions';
import { useTick } from './hooks/useTick';

type Props = {
  fixed: boolean;
  timeScale: TimeScale;
  dimensions: Dimensions;
};

export const CurrentTime: React.FC<Props> = ({
  fixed,
  timeScale,
  dimensions: { width, height },
}) => {
  const domain = timeScale.domain();
  const start = domain[0].getTime();
  const end = domain[1].getTime();
  const msPerPixel = (end - start) / width;

  const [now, setNow] = React.useState(Date.now);

  useTick(
    () => {
      const now = Date.now();
      if (now > start && now < end + msPerPixel * LABEL_MAX_WIDTH) {
        setNow(Date.now);
      }
    },
    msPerPixel,
    // @TODO: Only tick when visible and not static
    true
  );

  if (!fixed && (now < start || now > end)) {
    return null;
  }

  const x = fixed ? width / 2 : timeScale(now);
  const label = LABEL_FORMATTER(new Date(now));

  return (
    <g className="current-time">
      <line x1={x} y1={0} x2={x} y2={height} />
      <text
        className={classNames('label', {
          'near-right': x > width - LABEL_MAX_WIDTH,
        })}
        x={x}
        y={LABEL_OFFSET_TOP}
      >
        {label}
      </text>
    </g>
  );
};

const LABEL_FORMATTER = timeFormat('%a %d %b %H:%M:%S.%L');
const LABEL_MAX_WIDTH = 180;
const LABEL_OFFSET_TOP = 8;
