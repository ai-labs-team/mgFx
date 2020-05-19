import { implement, define, validate } from 'mgfx';
import { reject } from 'fluture';

import {
  mockConnector,
  ExpectedResolutionFailedError,
  ExpectedRejectionFailedError,
  UnmatchedRunChildError,
} from './index';

let didRun = false;
const setDidRun = implement(
  define({ name: 'setDidRun', input: validate.any, output: validate.any }),
  (value) => {
    didRun = value;
  }
);

const callChild = implement(
  define({ name: 'callChild', input: validate.void, output: validate.void }),
  (value, { runChild }) => runChild(setDidRun(true))
);

beforeEach(() => {
  didRun = false;
});

describe('.run().withInput()', () => {
  it('runs an implementation with input', async () => {
    await mockConnector().run(setDidRun).withInput(true).promise();
    expect(didRun).toBe(true);
  });

  it('rejects if an un-stubbed child Task is attempted', async () => {
    const test = mockConnector().run(callChild).withInput().promise();

    await expect(test).rejects.toBeInstanceOf(UnmatchedRunChildError);
    await expect(test).rejects.toHaveProperty(
      'message',
      `Task 'callChild' attempted to run child Task 'setDidRun'. Use '.stub()' to provide a stubbed implementation for 'setDidRun'.`
    );

    await expect(test).rejects.toHaveProperty('parentProcess', {
      id: expect.any(String),
      input: undefined,
      spec: callChild.spec,
      context: undefined,
    });

    await expect(test).rejects.toHaveProperty('childProcess', {
      id: expect.any(String),
      parentId: expect.any(String),
      input: true,
      spec: setDidRun.spec,
      context: undefined,
    });
  });
});

describe('.expect', () => {
  const identity = implement(
    define({ name: 'identity', input: validate.any, output: validate.any }),
    (value) => (value === 'oopsie' ? reject(new Error('nope')) : value)
  );

  describe('.resolution()', () => {
    it('resolves when an implementation resolves to an equal value', async () => {
      await mockConnector()
        .run(identity)
        .withInput({ testingEquality: true })
        .expect.resolution({ testingEquality: true })
        .promise();
    });

    it('rejects when an implementation resolves to an un-equal value', async () => {
      const test = mockConnector()
        .run(identity)
        .withInput({ testingEquality: 'true' })
        .expect.resolution({ testingEquality: true })
        .promise();

      await expect(test).rejects.toBeInstanceOf(ExpectedResolutionFailedError);
      await expect(test).rejects.toHaveProperty('expected', {
        testingEquality: true,
      });
      await expect(test).rejects.toHaveProperty('actual', {
        testingEquality: 'true',
      });
      await expect(test).rejects.toHaveProperty('isRejection', false);
      await expect(test).rejects.toHaveProperty(
        'message',
        'Task resolved with a different result to what was expected.'
      );
    });

    it('rejects when an implementation rejects', async () => {
      const test = mockConnector()
        .run(identity)
        .withInput('oopsie')
        .expect.resolution('oopsie')
        .promise();

      await expect(test).rejects.toBeInstanceOf(ExpectedResolutionFailedError);
      await expect(test).rejects.toHaveProperty('expected', 'oopsie');
      await expect(test).rejects.toHaveProperty('actual', new Error('nope'));
      await expect(test).rejects.toHaveProperty('isRejection', true);
      await expect(test).rejects.toHaveProperty(
        'message',
        'Task rejected when it was expected to resolve.'
      );
    });

    it('is aliased as `expect()`', async () => {
      await mockConnector()
        .run(identity)
        .withInput({ testingEquality: true })
        .expect({ testingEquality: true })
        .promise();
    });
  });

  describe('.rejection()', () => {
    it('resolves when an implementation rejects with an equal reason', async () => {
      await mockConnector()
        .run(identity)
        .withInput('oopsie')
        .expect.rejection(new Error('nope'))
        .promise();
    });

    it('rejects when an implementation rejects with an un-equal reason', async () => {
      const test = mockConnector()
        .run(identity)
        .withInput('oopsie')
        .expect.rejection(new Error('oh no!'))
        .promise();

      await expect(test).rejects.toBeInstanceOf(ExpectedRejectionFailedError);
      await expect(test).rejects.toHaveProperty(
        'expected',
        new Error('oh no!')
      );
      await expect(test).rejects.toHaveProperty('actual', new Error('nope'));
      await expect(test).rejects.toHaveProperty('isResolution', false);
      await expect(test).rejects.toHaveProperty(
        'message',
        'Task rejected with a different reason to what was expected.'
      );
    });

    it('rejects when an implementation resolves', async () => {
      const test = mockConnector()
        .run(identity)
        .withInput('howdy')
        .expect.rejection(new Error('nope'))
        .promise();

      await expect(test).rejects.toBeInstanceOf(ExpectedRejectionFailedError);
      await expect(test).rejects.toHaveProperty('expected', new Error('nope'));
      await expect(test).rejects.toHaveProperty('actual', 'howdy');
      await expect(test).rejects.toHaveProperty('isResolution', true);
      await expect(test).rejects.toHaveProperty(
        'message',
        'Task resolved when it was expected to reject.'
      );
    });
  });
});

describe('.stub()', () => {
  const getTime = implement(
    define({
      name: 'getTime',
      input: validate.string,
      output: validate.number,
    }),
    () => 24
  );

  const greet = implement(
    define({
      name: 'greet',
      input: validate.string,
      output: validate.string,
    }),
    (name, { runChild }) =>
      runChild(getTime('24h'))
        .map((hours) => (hours >= 12 ? 'afternoon' : 'morning'))
        .map((time) => `Good ${time}, ${name}!`)
  );

  describe('.as()', () => {
    it('stubs Task definitions with the given function', async () => {
      expect.assertions(1);

      await mockConnector()
        .stub(getTime)
        .as((input) => {
          expect(input).toBe('24h');
          return 11;
        })
        .run(greet)
        .withInput('World')
        .expect('Good morning, World!')
        .promise();

      await mockConnector()
        .stub(getTime)
        .as(() => 16)
        .run(greet)
        .withInput('World')
        .expect('Good afternoon, World!')
        .promise();
    });
  });
});
