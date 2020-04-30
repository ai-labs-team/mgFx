import { Fluenture } from 'mgfx/dist/utils/fluenture';
import { Event } from 'mgfx/dist/middleware/instrumenter';
import { stream, Emitter } from 'kefir';

import { Config, Receiver } from '.';
import { Storage } from './storage';
import { resolve } from 'fluture';

export const makeReceiver = (
  storage: Fluenture<any, Storage>,
  onFlush: () => any,
  buffer?: Config['buffer']
): Receiver =>
  buffer
    ? makeBufferedReceiver(storage, onFlush, buffer)
    : makeDefaultReceiver(storage, onFlush);

export const makeBufferedReceiver = (
  storage: Fluenture<any, Storage>,
  onFlush: () => any,
  buffer: Exclude<Config['buffer'], undefined>
): Receiver => {
  const putEvents = storage
    .map((storage) => {
      if (!storage.put.events) {
        throw new Error('Storage does not support Event buffering.');
      }

      return storage.put.events;
    })
    .cache();

  let _emitter: Emitter<Event, any>;

  stream<Event, any>((emitter) => {
    _emitter = emitter;
  })
    .bufferWithTimeOrCount(buffer.time || 250, buffer.count || 25)
    .filter((events) => events.length > 0)
    .observe((events) => {
      putEvents.chain((putEvents) => putEvents(events)).value(onFlush);
    });

  return (event) => {
    _emitter.emit(event);
  };
};

export const makeDefaultReceiver = (
  storage: Fluenture<any, Storage>,
  onFlush: () => any
): Receiver => (event) =>
  storage.chain((storage) => storage.put.event(event)).value(onFlush);
