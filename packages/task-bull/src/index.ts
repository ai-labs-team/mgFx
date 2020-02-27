import { ioTs, t } from '@mgfx/validator-iots';

import {
  Spec,
  InputOf,
  define,
  implement,
  ContextOf,
  OutputOf
} from 'mgfx/dist/task';
import {
  Queue,
  CompletedEventCallback,
  Job,
  FailedEventCallback,
  JobOptions
} from 'bull';
import { attemptP, chain, map, Future } from 'fluture';

export type BullSpec<S extends Spec> = S & {
  queue: Queue;
  mapData?: (input: InputOf<S>, context: ContextOf<S>) => any;
  mapOptions?: (input: InputOf<S>, context: ContextOf<S>) => JobOptions;
};

const waitForOutcome = <S extends Spec>({ queue }: BullSpec<S>) => ({
  jobId
}: {
  jobId: string | number;
}) =>
  Future<any, OutputOf<S>>((reject, resolve) => {
    const waitForCompletion: CompletedEventCallback = (
      completedJob,
      result
    ) => {
      if (completedJob.id !== jobId) {
        return;
      }

      detach();
      resolve(result);
    };

    const waitForFailure: FailedEventCallback = (failedJob, error) => {
      if (failedJob.id !== jobId) {
        return;
      }

      detach();
      reject(error);
    };

    queue.on('completed', waitForCompletion);
    queue.on('failed', waitForFailure);

    const detach = () => {
      queue.off('completed', waitForCompletion);
      queue.off('failed', waitForFailure);
    };

    return () => {
      detach();
    };
  });

const addJob = <S extends Spec>(spec: BullSpec<S>, input: any, context: any) =>
  attemptP(() => {
    const data = spec.mapData ? spec.mapData(input, context) : input;
    const options = spec.mapOptions
      ? spec.mapOptions(input, context)
      : undefined;

    return spec.queue.add(data, options).then(job => ({ jobId: job.id }));
  });

/**
 * Creates an mgFx Task Definition that, when run, will add a Job to a Bull queue. The `name`, `input`, `output` and
 * `context` properties of the Spec object will be re-used to create the Bull task definition. Other properties are
 * used to configure the Bull integration; see the `BullSpec` type alias for further information.
 *
 * Returns a Future that is 'attached' to the Job; the Future will settle with a value (or Error) representing the
 * actual processing of that Job.
 */
export const makeBullTask = <S extends Spec>(spec: BullSpec<S>) => {
  const definition = define({
    name: spec.name,
    input: spec.input,
    output: spec.output,
    context: spec.context
  });

  return implement(definition, (input, { context }) =>
    addJob(spec, input, context).pipe(chain(waitForOutcome(spec)))
  );
};

/**
 * Like `makeBullTask`, except that it creates a Task that starts Jobs in a 'detached' state; that is, it will return a
 * Future that will resolve with the ID of the job that was added to the Bull queue.
 */
export const makeDetachedBullTask = <S extends Spec>(spec: BullSpec<S>) => {
  const definition = define({
    name: spec.name,
    input: spec.input,
    output: ioTs(
      t.type({
        jobId: t.union([t.number, t.string])
      })
    ),
    context: spec.context
  });

  return implement(definition, (input, { context }) =>
    addJob(spec, input, context)
  );
};
