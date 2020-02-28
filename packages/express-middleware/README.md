# `@mgfx/express-middleware`

Express middleware for integration with mgFx applications.

## Features

- Creates per-route mgFx contexts that includes `http.method` and `http.path` Context Values automatically
- Run mgFx processes in that Context via `req.mgFx.run()`
- Run an arbitrary Future and fork it's resolution value or rejection reason to the HTTP response via `req.mgFx.fork`
- Run a Task and fork it to the Response in a single shot via `req.mgFx.runF()`

## Usage

1. Install `@mgfx/express-middleware` into your existing mgFx/Express application:

```
$ yarn add @mgfx/express-middleware
```

2. Add the Middleware to an Express application:

```typescript
import express from 'express';
import { localConnector } from 'mgfx';
import { expressMiddleware } from '@mgfx/express-middleware';

const connector = localConnector();
const app = express();

app.use(expressMiddleware({ connector }));

/** mgFx Task definitions, Express routes, etc */
```

3. Use `req.mgFx` within your Express handlers:

```typescript
import { after, fork, map } from 'fluture';

// Use `req.mgFx.run` to run a Task within the context of the current HTTP request:
app.get('/run/:name', (req, res, next) => {
  // `myTask` will be invoked in a Context that contains the values:
  // { 'http.path': '/run/:name', 'http.method': 'GET' }
  req.mgFx
    .run(myTask({ name: req.params.name }))
    // Explicitly use `Fluture.fork` to run this Future
    .pipe(fork(error => next(error)(result => res.send(result))));
});

// Use `req.mgFx.fork` to run an arbitrary Future and send it's value/error to the Response:
app.get('/fork/:name', req => {
  after(100)(`Hello ${name}!`).pipe(req.mgFx.fork);
});

// Use `req.mgFx.runF` to run a Task and send it's output directly to the response:
app.get('/runF/:name', req => {
  req.mgFx.runF(myTask({ name: req.params.name }));
});

// Use `req.mgFx.run` and `req.mgFx.fork` to run a Task, do some intermediate operation, and send the result to the
// Response:
app.get('/complex/:name', req => {
  req.mgFx
    .run(myTask({ name: req.params.name }))
    .pipe(map(result => result.length))
    .pipe(req.mgFx.fork);
});
```
