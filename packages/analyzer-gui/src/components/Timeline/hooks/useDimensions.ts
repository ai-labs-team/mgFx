import { useRef, useState, useEffect } from 'react';

export const useDimensions = () => {
  const container = useRef<HTMLDivElement>();

  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container.current);

    return () => observer.disconnect();
  }, [container]);

  return {
    container,
    dimensions,
  };
};

export type Dimensions = {
  height: number;
  width: number;
};
