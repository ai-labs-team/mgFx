import React from 'react';

import { AxisBottom } from '@vx/axis';
import { timeFormat } from 'd3-time-format';

import { TimeScale } from './hooks/useTransformedTimeScale';
import { Dimensions } from './hooks/useDimensions';

type Props = {
  timeScale: TimeScale;
  dimensions: Dimensions;
};

export const TimeAxis: React.FC<Props> = ({
  timeScale,
  dimensions: { width, height },
}) => {
  const minor = React.useMemo(
    () => (
      <AxisBottom
        axisClassName="time-axis-minor"
        scale={timeScale}
        top={height - MINOR_BOTTOM_OFFSET}
        tickValues={timeScale.ticks(MINOR_TICKS)}
      />
    ),
    [timeScale, height]
  );

  const major = React.useMemo(
    () => (
      <AxisBottom
        hideAxisLine
        hideTicks
        axisClassName="time-axis-major"
        scale={timeScale}
        top={height - MAJOR_BOTTOM_OFFSET}
        tickValues={majorTickValues(timeScale, width)}
        tickFormat={MAJOR_TICK_FORMATTER}
      />
    ),
    [timeScale, height, width]
  );

  return (
    <>
      {minor}
      {major}
    </>
  );
};

const majorTickValues = (scale: TimeScale, width: number): Date[] => {
  const [start, end] = scale.domain();
  const ticks = scale.ticks(1);

  const rest = ticks.filter(
    (tick) =>
      scale(tick) > MAJOR_TICK_MAX_WIDTH &&
      scale(tick) < width - MAJOR_TICK_MAX_WIDTH
  );

  return [start, ...rest, end];
};

const MINOR_BOTTOM_OFFSET = 50;
const MINOR_TICKS = 10;

const MAJOR_BOTTOM_OFFSET = 30;
const MAJOR_TICK_MAX_WIDTH = 180;
const MAJOR_TICK_FORMATTER = timeFormat('%a %d %b %H:%M:%S');
