import { promise } from 'fluture';
import { ValidationError } from 'mgfx/dist/validator';
import {
  boolean,
  object,
  string,
  DecodeError,
} from '@ailabs/ts-utils/dist/decoder';

import { decoder } from '.';

const testType = object('Test Object', {
  name: string,
  isTest: boolean,
});

const testDecoder = decoder(testType);

it('resolves with encoded data when decode succeeds', async () => {
  const test = testDecoder({ name: 'test', isTest: true }).pipe(promise);
  await expect(test).resolves.toEqual({ name: 'test', isTest: true });
});

it('rejects with a ValidationError when decode fails', async () => {
  const test = testDecoder({} as any).pipe(promise);
  await expect(test).rejects.toBeInstanceOf(ValidationError);
  await expect(test).rejects.toHaveProperty('errors', expect.any(DecodeError));
});
