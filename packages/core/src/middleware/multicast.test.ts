import { after, resolve, reject } from 'fluture';

import { local } from '../connector/local';
import { define, implement } from '../task';
import { validate } from '../';

import { multicast } from './multicast';
import { makeInstrumenter } from './instrumenter';

const connector = local();
const double = define({
  name: 'double',
  input: validate.number,
  output: validate.number,
});

connector.serve(
  implement(double, (n) => (n > 0 ? after(100)(n * 2) : reject('out of range')))
);

const receivers = [jest.fn(), jest.fn()];
const instrumenters = receivers.map((receiver) =>
  makeInstrumenter({ receiver })
);

connector.use(multicast(instrumenters));

beforeEach(() => {
  receivers.forEach((receiver) => receiver.mockReset());
});

it('sends events to all instrumenters', async () => {
  await expect(connector.run(double(5)).promise()).resolves.toBe(10);

  receivers.forEach((receiver) => {
    expect(receiver.mock.calls).toHaveLength(2);
    expect(receiver.mock.calls[0][0].kind).toBe('process');
    expect(receiver.mock.calls[0][0].process.input).toBe(5);

    expect(receiver.mock.calls[1][0].kind).toBe('resolution');
    expect(receiver.mock.calls[1][0].value).toBe(10);
  });
});

it('sends rejection events to all instrumenters', async () => {
  await expect(connector.run(double(-1)).promise()).rejects.toBe(
    'out of range'
  );

  receivers.forEach((receiver) => {
    expect(receiver.mock.calls).toHaveLength(2);
    expect(receiver.mock.calls[0][0].kind).toBe('process');
    expect(receiver.mock.calls[0][0].process.input).toBe(-1);

    expect(receiver.mock.calls[1][0].kind).toBe('rejection');
    expect(receiver.mock.calls[1][0].reason).toBe('out of range');
  });
});

it('sends cancellation events to all instrumenters', async () => {
  await connector.run(double(100)).race(after(10)(undefined)).promise();

  receivers.forEach((receiver) => {
    expect(receiver.mock.calls).toHaveLength(2);
    expect(receiver.mock.calls[0][0].kind).toBe('process');
    expect(receiver.mock.calls[0][0].process.input).toBe(100);

    expect(receiver.mock.calls[1][0].kind).toBe('cancellation');
  });
});
