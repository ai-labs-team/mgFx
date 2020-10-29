import { useEffect, useMemo, useState } from 'react';

import { scaleLinear } from '@vx/scale';
import { ScaleLinear } from 'd3-scale';

import { Transformation } from './useTranslatron';
import { Dimensions } from './useDimensions';

export const useTransformedRowScale = ({
  pendingTransform: { translateY },
  dimensions: { height },
}: Options) => {
  const [translation, setTranslation] = useState(0);

  useEffect(() => {
    setTranslation(Math.min(0, translation - translateY));
  }, [translateY]);

  return useMemo(() => {
    const start = DEFAULT_ROW_SCALE.invert(0 - translation);
    const end = DEFAULT_ROW_SCALE.invert(height - translation);

    return scaleLinear({
      range: [0, height],
      domain: [start, end],
    });
  }, [translation, height]);
};

export type RowScale = ScaleLinear<number, number>;

const DEFAULT_ROW_SCALE = scaleLinear({
  domain: [0, 1],
  range: [0, 20],
});

type Options = {
  pendingTransform: Transformation;
  dimensions: Dimensions;
};
