import { after, reject, rejectAfter, resolve } from 'fluture';

import {
  InputValidationError,
  OutputValidationError,
  Validator,
} from '../validator';
import { local } from '../connector/local';
import { define, implement } from '../task';

import { encoded } from './encoded';
import { makeInstrumenter } from './instrumenter';

const encodedNumber: Validator<number> = (n) => {
  if (typeof n !== 'number') {
    return reject(new InputValidationError(`Expected number, got ${typeof n}`));
  }

  return resolve(`Encoded<${n}>` as any);
};

const double = define({
  name: 'add',
  input: encodedNumber,
  output: encodedNumber,
});

const connector = local();
connector.serve(
  implement(double, (n) => {
    if (n > 100) {
      return rejectAfter(100)('Out of range');
    }

    return after(100)(n === -99 ? ('invalid output' as any) : n * 2);
  })
);

const receiver = jest.fn();
const instrumenter = makeInstrumenter({ receiver });
connector.use(encoded(instrumenter));

beforeEach(() => {
  receiver.mockReset();
});

describe('when input and output are valid', () => {
  it('passes encoded input and output to instrumenters', async () => {
    const result = await connector.run(double(5)).promise();

    expect(result).toBe(10);
    expect(receiver.mock.calls).toHaveLength(2);
    expect(receiver.mock.calls[0][0].kind).toEqual('process');
    expect(receiver.mock.calls[0][0].process.input).toEqual('Encoded<5>');

    expect(receiver.mock.calls[1][0].kind).toEqual('resolution');
    expect(receiver.mock.calls[1][0].value).toEqual('Encoded<10>');
  });
});

describe('when input is invalid', () => {
  it('passes InputValidationError to instrumenters', async () => {
    const result = connector.run(double('5' as any)).promise();

    await expect(result).rejects.toBeInstanceOf(InputValidationError);
    await expect(result).rejects.toHaveProperty(
      'errors',
      'Expected number, got string'
    );

    expect(receiver.mock.calls).toHaveLength(2);

    expect(receiver.mock.calls[0][0].kind).toEqual('process');
    expect(receiver.mock.calls[0][0].process.input).toBeInstanceOf(
      InputValidationError
    );
    expect(receiver.mock.calls[0][0].process.input).toHaveProperty(
      'errors',
      'Expected number, got string'
    );

    expect(receiver.mock.calls[1][0].kind).toEqual('rejection');
    expect(receiver.mock.calls[1][0].reason).toBeInstanceOf(
      InputValidationError
    );
    expect(receiver.mock.calls[1][0].reason).toHaveProperty(
      'errors',
      'Expected number, got string'
    );
  });
});

describe('when output is invalid', () => {
  it('passes OutputValidationError to instrumenters', async () => {
    const result = await connector.run(double(-99)).chainRej(resolve).promise();

    const assertError = (error: any) => {
      expect(error).toBeInstanceOf(OutputValidationError);
      expect(error.errors).toEqual('Expected number, got string');
    };

    assertError(result);

    expect(receiver.mock.calls).toHaveLength(2);
    expect(receiver.mock.calls[0][0].kind).toEqual('process');
    expect(receiver.mock.calls[0][0].process.input).toEqual('Encoded<-99>');

    expect(receiver.mock.calls[1][0].kind).toEqual('rejection');
    assertError(receiver.mock.calls[1][0].reason);
  });
});

describe('when Task rejects', () => {
  it('passes error to instrumenters', async () => {
    const result = await connector
      .run(double(1000))
      .chainRej(resolve)
      .promise();

    expect(result).toBe('Out of range');

    expect(receiver.mock.calls).toHaveLength(2);

    expect(receiver.mock.calls[0][0].kind).toEqual('process');
    expect(receiver.mock.calls[0][0].process.input).toEqual('Encoded<1000>');

    expect(receiver.mock.calls[1][0].kind).toEqual('rejection');
    expect(receiver.mock.calls[1][0].reason).toBe('Out of range');
  });
});

describe('when Process is cancelled', () => {
  it('passes cancellation to instrumenters', async () => {
    await connector.run(double(100)).race(after(10)(undefined)).promise();

    expect(receiver.mock.calls).toHaveLength(2);

    expect(receiver.mock.calls[0][0].kind).toEqual('process');
    expect(receiver.mock.calls[0][0].process.input).toEqual('Encoded<100>');

    expect(receiver.mock.calls[1][0].kind).toEqual('cancellation');
  });
});
