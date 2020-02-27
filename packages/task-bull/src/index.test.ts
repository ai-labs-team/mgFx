import { localConnector } from 'mgfx';
import * as testUtils from 'mgfx/dist/test-utils';

import { ioTs, t } from '@mgfx/validator-iots';
import { promise } from 'fluture';
import Queue from 'bull';

import { makeBullTask, makeDetachedBullTask } from './index';

let calls = 0;
const queue = new Queue('test');
queue.process((job, done) => {
  calls += 1;
  const { name } = job.data;

  if (name.startsWith('_')) {
    done(new Error(`Invalid name '${name}'`));
  }

  setTimeout(() => done(null, `Hello ${name}!`), 1000);
});

const mgFx = localConnector();
const withImplementation = testUtils.withImplementation(mgFx);

beforeAll(async () => {
  await Promise.all([queue.clean(0, 'completed'), queue.clean(0, 'failed')]);
});

beforeEach(() => {
  calls = 0;
});

describe('makeBullTask', () => {
  const greet = makeBullTask({
    queue,
    name: 'greet',
    input: ioTs(
      t.type({
        name: t.string
      })
    ),
    output: ioTs(t.string)
  });

  it('defines a Task that, when run, will start a Bull job and settle with the outcome', async () => {
    const result = await withImplementation(greet)(_ =>
      mgFx.run(greet({ name: 'World' }))
    ).pipe(promise);

    expect(result).toBe('Hello World!');
  });

  it('rejects with the failure reason of the job itself', async () => {
    try {
      await withImplementation(greet)(_ =>
        mgFx.run(greet({ name: '_World' }))
      ).pipe(promise);
    } catch (err) {
      expect(err.message).toBe(`Invalid name '_World'`);
    }
  });
});

describe('makeDetachedBullTask', () => {
  it('defines a Task that, when run, will start a Bull job and then resolve with the Job ID', async () => {
    const greetDetached = makeDetachedBullTask({
      queue,
      name: 'greetDetached',
      input: ioTs(
        t.type({
          name: t.string
        })
      ),
      output: ioTs(t.string)
    });

    const result = await withImplementation(greetDetached)(_ =>
      mgFx.run(greetDetached({ name: 'World' }))
    ).pipe(promise);

    expect(typeof result.jobId).toBe('string');
  });
});

it('allows data and options to be customised via mapping functions', async () => {
  const jobId = Date.now().toString();

  const greet = makeBullTask({
    queue,
    name: 'greet',
    input: ioTs(
      t.type({
        name: t.string
      })
    ),
    output: ioTs(t.string),
    mapData: input => ({
      name: `mapped ${input.name}`
    }),
    mapOptions: input => ({
      jobId
    })
  });

  const result = await withImplementation(greet)(_ =>
    mgFx.createContext({ isTest: true }).run(greet({ name: 'World' }))
  ).pipe(promise);

  expect(result).toBe('Hello mapped World!');
  const job = await queue.getJob(jobId);
  expect(job).not.toBe(null);
});

afterAll(() => {
  queue.close();
});
