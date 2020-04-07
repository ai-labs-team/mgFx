import {
  Event,
  ProcessEvent,
  RejectionEvent,
  ResolutionEvent,
  CancellationEvent,
} from 'mgfx/dist/middleware/instrumenter';
import { value, error } from '@mgfx/codecs';
import { FutureInstance, parallel, resolve } from 'fluture';

export const all = parallel(Infinity);

export const switchEvent = <T, D>(fns: {
  process: (event: ProcessEvent, data?: D) => T;
  rejection: (event: RejectionEvent, data?: D) => T;
  resolution: (event: ResolutionEvent, data?: D) => T;
  cancellation: (event: CancellationEvent, data?: D) => T;
}) => (event: Event, data?: D): T => {
  if (event.kind === 'process') {
    return fns.process(event, data);
  }

  if (event.kind === 'rejection') {
    return fns.rejection(event, data);
  }

  if (event.kind === 'resolution') {
    return fns.resolution(event, data);
  }

  if (event.kind === 'cancellation') {
    return fns.cancellation(event, data);
  }

  throw new Error('Invalid event kind');
};

export const encodeEvent = switchEvent<FutureInstance<any, any>, never>({
  process: (event) =>
    all([
      value.encode(event.process.input),
      value.encode(event.process.context?.values ?? undefined),
    ]),

  rejection: (event) => error.encode(event.reason),

  resolution: (event) => value.encode(event.value),

  cancellation: () => resolve(undefined),
});
