# `@mgfx/validator-iots`

A validation library for mgFx that allows the use of `io-ts` decoders to validate Task input and output.

## Usage

1. Install `@mgfx/validator-iots` into your existing mgFx application:

```
$ yarn add @mgfx/validator-iots
```

2. Use the `ioTs` function to use an io-ts decoder as a Validator in your Task definitions:

```typescript
import { ioTs, t } from '@mgfx/validator-iots';
import { define } from 'mgfx';

const myTask = define({
  name: 'myTask',
  input: ioTs(t.string),
  output: ioTs(t.array(t.number))
});
```
