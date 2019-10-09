<div align="center">

![mgfx](./docs/logo.png "mgfx")

# mgFx: Managed Effects for JavaScript

</div>

mgFx is a library for JavaScript applications that allows you to define asynchronous, side-effecting code ('Tasks') and
then invoke those tasks (an 'Execution') in a predictable manner.

## Quick-Start Guide

1. Add mgFx to your existing NodeJS application:

  ```bash
  $ yarn add mgfx
  ```
  
2. Define a Task:

  ```typescript
  import { Task } from 'mgfx';

  class Wait extends Task {
    run(ms: number) {
      setTimeout(() => this.resolve(), ms);
    }
  }
  ```

3. Create a Scheduler:

  ```typescript
  import { singleProcess } from 'mgfx';

  const { scheduler } = singleProcess({
    tasks: [
      Wait
    ]
  });
  ```

4. Use the Scheduler to execute your Task:

  ```typescript
  scheduler.exec(Wait, 1000)
    .then(() => console.log('The wait is over!'));
  ```

## Going Further

The Quick-Start guide merely scratches the surface of what mgFx can provide. Other features that need to be highlighted
and documented are:

- Multi-threaded execution of Tasks by using Workers.
- 'Categorising' Task executions by using Contexts.
- Cancelling Task executions.
- The [additional tools](./packages) in the mgFx ecosystem.

## Instrumentation

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
  tasks: [ /* Your list of tasks... */ ]
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

## Roadmap/Planned Features

- Support an existing asynchronous primitive such as [Fluture](https://github.com/fluture-js/Fluture) for better
  composition of Tasks.
