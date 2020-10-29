import { Span } from '@mgfx/analyzer';
import { useThrottle } from '@react-hook/throttle';

import { useWorker } from 'react-hooks-worker';
import { useEffect, useState, useMemo } from 'react';
import { assocPath } from 'ramda';

import { useAppContext } from '@mgfx/analyzer-gui-common/contexts/App';
import * as Render from '../workers/render';
import * as Optimize from '../workers/optimize';

import { OptimizedLayout } from '../renderer';
import { TimeScale } from './useTransformedTimeScale';
import { RowScale } from './useTransformedRowScale';

export type Options = {
  spans: Span[];
  timeScale: TimeScale;
  rowScale: RowScale;
};

export const useOptimizedLayout = ({
  spans,
  timeScale,
  rowScale,
}: Options): Result => {
  const { workers } = useAppContext();

  const [metrics, setMetrics] = useState<Metrics>({
    render: {
      spans: spans.length,
      time: 0,
    },
    optimize: {
      time: 0,
    },
  });

  const renderInput = useMemo(() => [spans], [spans]);
  const rendered: {
    result?: Render.Output;
    error?: any;
  } = useWorker(workers.render, renderInput) as any;

  const volatileOptimizeInput = getInput(rendered, timeScale, rowScale);
  const [optimizeInput, setOptimizeInput] = useThrottle(
    volatileOptimizeInput,
    MAX_FPS
  );

  const optimized: {
    result?: Optimize.Output;
    error?: any;
  } = useWorker(workers.optimize, optimizeInput) as any;

  useEffect(() => {
    setOptimizeInput(volatileOptimizeInput);
  }, [
    volatileOptimizeInput[0],
    ...volatileOptimizeInput[1],
    ...volatileOptimizeInput[2],
    volatileOptimizeInput[3],
  ]);

  useEffect(() => {
    setMetrics(updateRenderSpans(spans.length));
  }, [spans.length]);

  useEffect(() => {
    if (rendered?.result?.time) {
      setMetrics(updateRenderTime(rendered.result.time));
    }
  }, [rendered?.result?.time ?? undefined]);

  useEffect(() => {
    if (optimized?.result?.time) {
      setMetrics(updateOptimizeTime(optimized.result.time));
    }
  }, [optimized?.result?.time ?? undefined]);

  if (rendered.error) {
    return {
      metrics,
      layout: [],
      error: {
        render: rendered.error,
      },
    };
  }

  if (optimized.error) {
    return {
      metrics,
      layout: [],
      error: {
        optimize: optimized.error,
      },
    };
  }

  return {
    metrics,
    layout: optimized?.result?.value ?? [],
  };
};

const yRange = (scale: RowScale): [number, number] => {
  const domain = scale.domain();

  const min = Math.floor(domain[0]);
  const max = Math.ceil(domain[1]);
  const range = max - min;
  const overdraw = (range * OVERDRAW_FACTOR) / 2;

  return [Math.max(0, min - Math.floor(overdraw)), max + Math.ceil(overdraw)];
};

const xRange = (scale: TimeScale): [number, number] => {
  const domain = scale.domain();

  const min = domain[0].getTime();
  const max = domain[1].getTime();

  const range = max - min;
  const overdraw = (range * OVERDRAW_FACTOR) / 2;

  return [min - overdraw, max + overdraw];
};

const xResolution = (scale: TimeScale): number =>
  scale.invert(COALESCE_PIXELS).getTime() - scale.invert(0).getTime();

const getInput = (
  rendered: { result?: Render.Output; error?: any },
  xScale: TimeScale,
  yScale: RowScale
): Optimize.Input => [
  rendered?.result?.value ?? undefined,
  yRange(yScale),
  xRange(xScale),
  xResolution(xScale),
];

const updateRenderSpans = assocPath<number, Metrics>(['render', 'spans']);
const updateRenderTime = assocPath<number, Metrics>(['render', 'time']);
const updateOptimizeTime = assocPath<number, Metrics>(['optimize', 'time']);

const MAX_FPS = 4;
const COALESCE_PIXELS = 1;
const OVERDRAW_FACTOR = 1;

export type Result = {
  metrics: Metrics;
  layout: OptimizedLayout;
  error?: { render: any } | { optimize: any };
};

type Metrics = {
  render: {
    spans: number;
    time: number;
  };
  optimize: {
    time: number;
  };
};
