import { useState, useRef, useCallback, useEffect } from 'react';

import { localPoint } from '@vx/event';
import {
  composeMatrices,
  scaleMatrix,
  translateMatrix,
} from '@vx/zoom/lib/util/matrix';

import { Dimensions } from './useDimensions';

export const useTranslatron = ({ dimensions: { width }, onClick }: Options) => {
  const { current: volatile } = useRef<VolatileState>({
    isDragging: false,
    previousCursorPosition: undefined,
  });

  const [cursorPosition, setCursorPosition] = useState<MaybePoint>();

  const [pendingTransform, setPendingTransform] = useState<Transformation>({
    translateX: 0,
    translateY: 0,
    scaleX: 1,
  });

  const onWheel = useCallback<React.WheelEventHandler>(
    (event) => {
      const point = localPoint(event);
      const scaleX = event.deltaY > 0 ? 1.1 : 0.9;
      const x = point.x - width / 2;

      const { translateX } = composeMatrices(
        translateMatrix(x, 0),
        scaleMatrix(scaleX, 1),
        translateMatrix(-x, 0)
      );

      setPendingTransform({
        translateY: 0,
        translateX: translateX,
        scaleX,
      });
    },
    [width]
  );

  const onMouseDown = useCallback<React.MouseEventHandler>((event) => {
    volatile.isDragging = false;
    volatile.previousCursorPosition = localPoint(event);
  }, []);

  const onMouseMove = useCallback<React.MouseEventHandler>((event) => {
    const point = localPoint(event);
    setCursorPosition(point);

    if (!volatile.previousCursorPosition) {
      return;
    }

    const previousPoint = volatile.previousCursorPosition;

    setPendingTransform({
      translateX: previousPoint.x - point.x,
      translateY: previousPoint.y - point.y,
      scaleX: 1,
    });

    volatile.isDragging = true;
    volatile.previousCursorPosition = point;
  }, []);

  const onMouseUp = useCallback<React.MouseEventHandler>(() => {
    if (!volatile.isDragging) {
      onClick();
    }

    volatile.isDragging = false;
    volatile.previousCursorPosition = undefined;
  }, [onClick]);

  const onMouseLeave = useCallback<React.MouseEventHandler>(() => {
    volatile.isDragging = false;
    volatile.previousCursorPosition = undefined;
  }, []);

  // If transformation has changed due to a mouse event, reset values to defaults on next render cycle
  useEffect(() => {
    setPendingTransform({
      translateX: 0,
      translateY: 0,
      scaleX: 1,
    });
  }, [
    pendingTransform.translateX !== 0,
    pendingTransform.translateY !== 0,
    pendingTransform.scaleX !== 1,
  ]);

  return {
    pendingTransform,
    cursorPosition,
    eventHandlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
  };
};

type VolatileState = {
  isDragging: boolean;
  previousCursorPosition: MaybePoint;
};

type Point = {
  x: number;
  y: number;
};

export type MaybePoint = Point | undefined;

export type Transformation = {
  translateX: number;
  translateY: number;
  scaleX: number;
};

type Options = {
  dimensions: Dimensions;
  onClick: () => void;
};
