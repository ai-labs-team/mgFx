# `@mgfx/instrumenter-pino`

An mgFx Instrumenter that uses Pino as a logging provider.

## Usage

1. Install `@mgfx/instrumenter-pino` into your existing mgFx application:

```
$ yarn add @mgfx/instrumenter-pino
```

2. Add the Instrumenter middleware to your mgFx connector:

```typescript
import { localConnector } from 'mgfx';
import { pino } from '@mgfx/instrumenter-pino';

const connector = localConnector();
connector.use(pino());
```
