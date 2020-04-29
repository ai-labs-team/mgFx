import { useState, useEffect, useMemo } from 'react';

import { scaleTime } from '@vx/scale';
import { ScaleTime } from 'd3-scale';

import { Dimensions } from './useDimensions';
import { Transformation } from './useTranslatron';
import { useTick } from './useTick';

export const useTransformedTimeScale = ({
  focus,
  pendingTransform: { translateX, scaleX },
  dimensions: { width },
}: Options) => {
  const [center, setCenter] = useState(() => focusCenter(focus));
  const [range, setRange] = useState(() => focusRange(focus));

  useEffect(() => {
    if (translateX === 0 && scaleX === 1) {
      return;
    }

    if (focus.kind !== 'now' || !focus.following) {
      const msPerPixel = range / width;
      const translateMs = msPerPixel * translateX;
      setCenter(center + translateMs);
    }

    setRange(range * scaleX);
  }, [translateX, scaleX, width]);

  const tickPeriod = range / width;
  const shouldTick = focus.kind === 'now' && focus.following;

  useTick(
    () => {
      setCenter(Date.now);
    },
    tickPeriod,
    shouldTick
  );

  return useMemo(() => {
    const startMs = center - range / 2;
    const endMs = center + range / 2;

    return scaleTime({
      range: [0, width],
      domain: [new Date(startMs), new Date(endMs)],
    });
  }, [center, range, width]);
};

export type Focus =
  | {
      kind: 'now';
      range?: number;
      following?: boolean;
    }
  | {
      kind: 'span';
      id: string;
    }
  | {
      kind: 'range';
      start: number;
      end: number;
    }
  | {
      kind: 'latest';
      following?: boolean;
    };

export type TimeScale = ScaleTime<number, number>;

const focusCenter = (focus: Focus) => {
  if (focus.kind === 'now') {
    return Date.now();
  }

  throw new Error('Not Implemented Yet');
};

const focusRange = (focus: Focus) => {
  if (focus.kind === 'now') {
    return focus.range || DEFAULT_TIME_RANGE;
  }

  throw new Error('Not Implemented Yet');
};

const DEFAULT_TIME_RANGE = 10 * 60 * 1000;

type Options = {
  focus: Focus;
  dimensions: Dimensions;
  pendingTransform: Transformation;
};
