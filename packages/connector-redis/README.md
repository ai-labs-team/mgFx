# `@mgfx/connector-redis`

An mgFx connector that uses Redis to provide a distributed Task processing mechanism.

## Usage

1. Install `@mgfx/connector-redis` into your existing mgFx application:

```
$ yarn add @mgfx/connector-redis
```

2. Define a Task that is visible to both the 'producer' and 'consumer':

```typescript
// tasks.ts
import { define } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';

export const myTask = define({
  name: 'myTask',
  input: ioTs(t.string),
  output: ioTs(t.string)
});
```

3. Create a 'consumer' module that uses the Redis connector to serve an implementation of your Task:

```typescript
// consumer.ts
import { implement } from 'mgfx';
import { redis } from '@mgx/connector-redis';
import { myTask } from './tasks';

const mgFx = redis();

mgFx.serve(implement(myTask, name => `Hello ${name}!`));
```

4. Create a 'producer' module that uses the Redis connector to run Tasks in a distributed manner:

```typescript
// producer.ts
import { redis } from '@mgx/connector-redis';
import { promise } from 'fluture';
import { myTask } from './tasks';

const mgFx = redis();

promise(mgFx.run(myTask('World'))).then(console.log);
```
