<div align="center">

![mgfx](./website/static/img/logo.png 'mgfx')

# mgFx: Managed Effects for JavaScript

</div>

mgFx is a library for JavaScript applications that allows you to define asynchronous, side-effecting code ('Tasks') and
then invoke those tasks in a predictable and type-safe manner.

## Quick-Start Guide

1. Add mgFx to your existing NodeJS application:

```bash
$ yarn add mgfx
```

2. Define and Implement a Task:

```typescript
import { define, implement } from 'mgfx';

const greet = implement(
  define({ name: 'greet' }),
  (input) => `Hello ${input.name}!`
);
```

3. Create a Connector:

```typescript
import { localConnector } from 'mgfx';

const mgFx = localConnector();
```

4. Tell your Connector to serve the Task implementation:

```typescript
mgFx.serve(greet);

mgFx.run(greet({ name: 'World' })).value(console.log);

// Logs: `Hello World!`
```

## Going Further

The Quick-Start guide merely scratches the surface of what mgFx can provide. Other features that need to be highlighted
and documented are:

- Run-time validation of Task input and output.
- Composing Tasks that run other Tasks.
- Run-time instrumentation and aggregated telemetry.
- The [additional tools](./packages) in the mgFx ecosystem.

## Instrumentation

**TODO**: This section is currently out of date; it will be rewritten when _telemetry aggregation_ has been
\*implemented.

A first-class priorty of mgFx is the ability to observe and analyse the behaviour of an application using mgFx at
runtime. To achieve this, mgFx has three distinct 'layers' that are designed to work together:

1. A built-in 'Instrumentation' system that exposes mgFx's runtime behaviour.
2. [@mgfx/recorder](./packages/recorder) captures the Instrumenter's output and stores it in an SQL database.
3. [@mgfx/inspector](./packages/inspector/README.md) provides a way for engineers to examine these events in a
   browser-based GUI.

This can also be depicted via a (somewhat crude) diagram:

```
+-------------------+        +----------------+           +--------------+        +-----------------+
| Your Application  | stdout |                |  INSERT/  |              | SELECT |                 |
|         +         +--------> @mgFx/recorder ------------> SQL Database ---------> @mgFx/inspector |
| mgFx Instrumenter |        |                |  UPDATE   |              |        |                 |
+-------------------+        +----------------+           +--------------+        +-----------------+
```

To enable Instrumentation for your mgFx application, simply create an `Instrumenter` instance, passing in your
`Scheduler` instance. For example:

```typescript
import { Inspector, singleProcess } from 'mgfx';

const { scheduler } = singleProcess({
  tasks: [
    /* Your list of tasks... */
  ],
});

new Instrumenter({ scheduler });
```

When you run your application, the Instrumenter will now emit structured messages to `stdout`. It is possible to pipe
this output into `@mgfx/recorder`, like so:

```bash
$ node your-app.js | npx @mgfx/recorder sqlite mgfx-instrumentation.db
```

You may then use `@mgfx/inspector` to review events by pointing it to the same file:

```bash
$ npx @mgfx/inspector sqlite mgfx-instrumentation.db
```

Please consult the [Inspector documentation](./packages/inspector/README.md) for further information.
