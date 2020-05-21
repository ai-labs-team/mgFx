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
import { Fluent } from 'mgfx/dist/utils/fluenture';

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

export type ExpectResolution<S extends Spec> = (
  expected: InputOf<S>
) => Fluent<ExpectedResolutionFailedError, void>;
export type ExpectRejection = (
  expected: any
) => Fluent<ExpectedRejectionFailedError, void>;

export const mockConnector = () => {
  const connector = localConnector();

  const self: MockInterface = {
    run: (implementation) => {
      connector.serve(implementation);

      return {
        withInput: (input) => {
          const future = implementation(input).pipe((processF) =>
            connector.run(processF).pipe(matchUnmatchedRunChildError(processF))
          );

          const resolution = (expected: any) =>
            future.pipe(matchResolution(expected));

          const rejection = (expected: any) =>
            future.pipe(matchRejection(expected));

          const expect = Object.assign(resolution, { resolution, rejection });

          return Object.assign(future, { expect });
        },
      };
    },
    stub: (definition) => ({
      as: (implementation) => {
        connector.serve(implement(definition, implementation));
        return self;
      },
    }),
  };

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

export type MockInterface = {
  /**
   * Instructs the Mock Connector which Task Implementation should be considered under test.
   *
   * @param implementation The Task Implementation to test.
   */
  run: <S extends Spec>(
    implementation: Implementation<S>
  ) => {
    /**
     * Instructs the Mock Connector what input should be given to the Task Implement under test.
     *
     * @param input The input to provide to the Task Implementation.
     * @return A Fluent Future, with additional `.expect` utilities.
     */
    withInput: (
      input: InputOf<S>
    ) => Fluent<any, OutputOf<S>> & {
      /**
       * Allows access to `.resolution` and `.rejection` expectation helpers, and is also an alias for
       * `.expect.resolution`, for convenience.
       */
      expect: ExpectResolution<S> & {
        /**
         * Asserts that the current Future _resolves_ with a value that is deeply equal according to
         * `fast-deep-equal`.
         *
         * @param expected The expected resolution value of this Future.
         */
        resolution: ExpectResolution<S>;
        /**
         * Asserts that the current Future _rejects_ with a reason that is deeply equal according to
         * `fast-deep-equal`.
         *
         * @param expected The expected rejection reason of this Future.
         */
        rejection: ExpectRejection;
      };
    };
  };

  /**
   * Allows calls to `.runChild` within the Task Implementation under test to be 'stubbed'.
   *
   * @param definition The Task Definition that should be stubbed.
   */
  stub: <S extends Spec>(
    definition: Definition<S>
  ) => {
    /**
     * Allows the preceeding call to `.stub` to specify the mock implementation function to use.
     *
     * @param implementation A mock implementation function; it will receive the input given to the child task by the
     * parent Task Implementation under test, and should return either a synchronous value, or a Future (this is
     * ideal for tests which need to simulate failure.)
     *
     * @return The top-level fluent interface, so that more calls to `.stub()`, `.run()`, etc may be made.
     */
    as: (implementation: ImplementationFunction<S>) => MockInterface;
  };
};
