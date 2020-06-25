import { Event } from 'mgfx/dist/middleware/instrumenter';
import { serializeError } from 'serialize-error';
import pgPromise from 'pg-promise';

const pgp = pgPromise();

const columns = new pgp.helpers.ColumnSet(['event'], { table: 'events' });

export const buildQuery = (event: Event) => {
  const data = {
    event:
      event.kind === 'rejection'
        ? { ...event, reason: serializeError(event.reason) }
        : event,
  };

  return pgp.helpers.insert(data, columns);
};