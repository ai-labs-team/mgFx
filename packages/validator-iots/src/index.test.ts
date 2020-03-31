import { ioTs, t } from './index';
import { promise } from 'fluture';
import { ValidationError } from 'mgfx/dist/validator';

const validator = ioTs(
  t.type({
    greeting: t.string
  })
);

it('resolves valid values', async () => {
  const result = await validator({ greeting: 'hello' }).pipe(promise);
  expect(result).toEqual({ greeting: 'hello' });
});

it('rejects invalid values', async () => {
  expect.assertions(2);

  try {
    await validator({ greeting: 123 as any }).pipe(promise);
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errors).toEqual([
      {
        path: ['greeting'],
        expected: 'string',
        actual: 123
      }
    ]);
  }
});
