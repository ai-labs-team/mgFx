import { Redis } from 'ioredis';
import { createPool, Pool } from 'generic-pool';
import { attemptP, encaseP, hook } from 'fluture';

export const makeConnectionPool = (r: Redis, max: number) =>
  createPool<Redis>(
    {
      create: async () => {
        return r.duplicate();
      },

      destroy: async client => {
        return client.disconnect();
      }
    },
    {
      min: 1,
      max
    }
  );

export const poolHook = (pool: Pool<Redis>) => {
  const acquire = attemptP(pool.acquire.bind(pool) as () => Promise<Redis>);
  const dispose = encaseP(
    pool.destroy.bind(pool) as (client: Redis) => Promise<void>
  );

  return hook(acquire)(dispose);
};
