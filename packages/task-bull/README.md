# `@mgfx/task-bull`

A generic mgFx task definition that allows you to run Bull Jobs.

## Features

- Delegate a Task's computation to existing Bull Jobs
- Gain the benefits of mgFx's Future-based asynchronous behaviour

## Usage

1. Install `@mgfx/task-bull` into your existing mgFx application:

```
$ yarn add @mgfx/task-bull
```

2. Define a Bull task using `defineBullTask`:

```typescript
import { defineBullTask } from '@mgfx/task-bull`;

const videoTranscodeQueue = new Bull();

const transcodeVideo = defineBullTask({
  name: 'transcodeVideo',
  queue: videoTranscodeQueue
});

mgFx.serve(transcodeVideo);

mgFx.run(transcodeVideo({/* ... */})).pipe(/* Fluture.fork, etc */)
```
