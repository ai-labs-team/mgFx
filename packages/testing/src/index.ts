import { localConnector } from 'mgfx';
import { NoImplementationError } from 'mgfx/dist/connector/local';
import {
  Definition,
  Implementation,
  InputOf,
  OutputOf,
  Process,
  implement,
  ImplementationFunction,
  Spec,
} from 'mgfx/dist/task';

import {
  bichain,
  chain,
  chainRej,
  resolve,
  reject,
  FutureInstance,
} from 'fluture';

import { CustomError } from 'ts-custom-error';
import fastEquals from 'fast-deep-equal';

export const mockConnector = () => {
  const connector = localConnector();

  const run = <I extends Implementation>(implementation: I) => {
    connector.serve(implementation);

    const withInput = (input: InputOf<I['spec']>) => {
      const future = implementation(input).pipe((processF) =>
        connector
          .run(processF)
          .pipe(matchUnmatchedRunChildError(implementation.spec, processF))
      );

      const expect = (expected: OutputOf<I['spec']>) =>
        future.pipe(matchResolution(expected));

      return Object.assign(future, {
        expect: Object.assign(expect, {
          resolution: expect,
          rejection: (expected: any) => future.pipe(matchRejection(expected)),
        }),
      });
    };

    return { withInput };
  };

  const stub = <D extends Definition>(definition: D) => {
    const as = (stub: ImplementationFunction<D['spec']>) => {
      connector.serve(implement(definition, stub));

      return self;
    };

    return { as };
  };

  const self = { run, stub };
  return self;
};

export const matchResolution = (expected: any) =>
  bichain<any, ExpectedResolutionFailedError, void>((actual) =>
    reject(new ExpectedResolutionFailedError(expected, actual, true))
  )((actual) =>
    fastEquals(expected, actual)
      ? resolve(undefined)
      : reject(new ExpectedResolutionFailedError(expected, actual))
  );

export const matchRejection = (expected: any) =>
  bichain<any, ExpectedRejectionFailedError, void>((actual) =>
    fastEquals(expected, actual)
      ? resolve(undefined)
      : reject(new ExpectedRejectionFailedError(expected, actual))
  )((actual) =>
    reject(new ExpectedRejectionFailedError(expected, actual, true))
  );

export const matchUnmatchedRunChildError = (
  spec: Spec,
  processF: FutureInstance<any, Process>
) =>
  chainRej((reason: any) =>
    reason instanceof NoImplementationError
      ? processF.pipe(
          chain((parentProcess) =>
            reject(new UnmatchedRunChildError(parentProcess, reason.process))
          )
        )
      : reject(reason)
  );

export class ExpectedResolutionFailedError extends CustomError {
  constructor(
    public readonly expected: any,
    public readonly actual: any,
    public readonly isRejection = false
  ) {
    super(
      isRejection
        ? 'Task rejected when it was expected to resolve.'
        : 'Task resolved with a different result to what was expected.'
    );
  }
}

export class ExpectedRejectionFailedError extends CustomError {
  constructor(
    public readonly expected: any,
    public readonly actual: any,
    public readonly isResolution = false
  ) {
    super(
      isResolution
        ? 'Task resolved when it was expected to reject.'
        : 'Task rejected with a different reason to what was expected.'
    );
  }
}

export class UnmatchedRunChildError extends CustomError {
  constructor(
    public readonly parentProcess: Process,
    public readonly childProcess: Process
  ) {
    super(
      `Task '${parentProcess.spec.name}' attempted to run child Task '${childProcess.spec.name}'. Use '.stub()' to provide a stubbed implementation for '${childProcess.spec.name}'.`
    );
  }
}
