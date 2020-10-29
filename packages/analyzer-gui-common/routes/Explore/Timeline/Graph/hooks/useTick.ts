import { useEffect, useRef } from 'react';

export const useTick = (
  callback: () => void,
  period: number,
  enabled = true
) => {
  const { current: volatile } = useRef<VolatileState>({
    prevTime: 0,
    nextFrame: undefined,
  });

  const clampedPeriod = Math.max(MIN_UPDATE_PERIOD, period);

  const loop = (time: number) => {
    if (time >= volatile.prevTime + clampedPeriod) {
      callback();
      volatile.prevTime = time;
    }

    volatile.nextFrame = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (enabled) {
      volatile.nextFrame = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(volatile.nextFrame);
    };
  }, [callback, period, enabled]);
};

type VolatileState = {
  prevTime: number;
  nextFrame: number | undefined;
};

const MAX_FPS = 60;
const MIN_UPDATE_PERIOD = Math.floor(1000 / MAX_FPS);
