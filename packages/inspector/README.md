# `@mgfx/inspector`

A tool for exploring, analysing and debugging mgFx runtime activity across time and space.

![Preview](./docs/preview.gif)

## Features

- Explore mgFx Task executions across time on the horizontal axis.
- Tasks are grouped vertically by their mgFx context.
- For a given task: examine the state, duration, input arguments and output result.
- View activity timing for Contexts (tasks in current Context vs. tasks in descendant Contexts).
- View application activity in real-time ([experimental](#experimental-features)).

## Usage

1. Configure your mgFx application to use the [instrumentation API](../../README.md#instrumentation).

  For example:

  ```typescript
  import { Instrumenter } from 'mgfx';

  new Instrumenter({ scheduler: yourMgFxSchedulerInstance });
  ```

2. Run your mgFx application, passing the instrumentation output to the [mgFx recorder](../recorder/README.md#usage).

   For example:

  ```bash
  $ node your-mgfx-app.js | npx @mgfx/recorder sqlite /path/to/recorder/output.db
  ```

3. While your application is running, start the mgFx Inspector, specifying the path to the same sqlite database that the
   mgFx recorder is using:

  ```bash
  $ npx @mgfx/inspector sqlite /path/to/recorder/output.db
  ```

4. The Inspector user interface may be accessed via http://localhost:8080. The port that the HTTP server starts on may be changed via the `--port` command-line option.

## Experimental Features

### Realtime activity ('follow' mode)

This feature has not yet been surfaced in the UI, but may be enabled by opening the browser window's developer tools and running:

```javascript
window.FOLLOW()
```

in the JavaScript console.

## Roadmap/Planned Features

This list is by no means exhaustive; please feel free to raise an issue suggesting a feature or a Pull Request
implementing one.

- Stress-test: Ensure that the Inspector performs adequately on large data sets.
- Colour-code Tasks in the Timeline based on their state.
- Navigation controls ('go to most recent', 'go to last rejected Task', etc).
- Support for PostgreSQL as an additional database provider.
- Production Usage: Document how to use the Recorder and Inspector for analysis and monitoring of an application running
  in Production.
- 'Real' realtime mode using WebSockets.
- View the 'chain' of execution for a given Task. For example, highlight ancestors, descendants and siblings of a Task
  when hovering over it.
- Better display/interaction of short-lived tasks without the need to zoom to down to milliseconds.
