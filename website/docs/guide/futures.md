---
title: Futures & Asyncronous Behaviour
---

So far, the simple `sayHello` task that we've been working on returns a value _synchronously_. However, communication with the outside world (or even outside of the same OS Process) is rarely able to do so. Instead, we need a way for Tasks to be to operate in a non-blocking, _asynchronous manner_.

## Enter Futures

mgFx uses the _Future_ as the means of representing and handling asychronous Tasks. When compared to _Promises_ (and the `async/await` sugar), Futures offer the following advantages:

- Futures are **lazy** by default, and remain as an abstract data structure until explicitly executed. This closely mirrors the overall goal of mgFx itself, and opens up interesting possibilities for static and/or real-world analysis of Task execution.

- Futures are **cancellable**. Unlike Promises, the ability to Cancel a pending or in-flight process is built-in to the specification in a predictable manner.

- Futures have a definite 'error' type. Whereas a Promise only represents a single **success** value (`Promise<SuccessVal>`), Futures specify two type parameters - `Future<ErrVal, SuccessVal>`.

mgFx uses [Fluture](https://github.com/fluture-js/Fluture) to provide an implementation of Futures for JavaScript. Since the mgFx core requires `fluture` as a dependency, the functions that it offers for manipulation and inspection will be available to your applications automatically via `import * from 'fluture'`.

:::info Stick Around
Even if you've never used Futures or Fluture before, stick around. We'll take a look at the basics of dealing with Futures towards the end of this chapter.
:::

## How mgFx uses Futures

There are two ways in which mgFx uses Futures to represent async. behaviour:

### 1. In Task Implementations

This first way may be considered an optional convenience. The Implementation function may return a 'plain' value or a Future that will resolve to an equivalent value. However, mgFx will enforce the _type_ of the value. Take the following examples:

```typescript
import { after } from 'fluture';
import { define, implement, validate } from 'mgfx';

const sayHello = mgFx.define({
  name: 'sayHello',
  input: validate.string,
  output: validate.string,
});

// VALID - Returns a synchronous value of type `string`.
implement(sayHello, (name) => {
  return `Hello, ${name}!`;
});

// VALID - Returns a Future of type `string`.
implement(sayHello, (name) => {
  return after(1000)(`Hello, ${name}!`);
});

// INVALID - Returns a synchronous value of type `number`.
implement(sayHello, (name) => {
  return -99;
});

// INVALID - Returns a Future of type `number`.
implement(sayHello, (name) => {
  return after(1000)(-99);
});
```

### 2. When running a Task

Although Task implementations have the choice of returning a plain value or a Future, the 'initating' side must always treat the process as asynchronous. Therefore, `connector.run()` will always return a Future:

```typescript file=./futures-1.ts
```

### Fluent Interface

By default, Fluture's Future's only implement a single method; `.pipe()`. This method is intended to be used in combination with Fluture's other transforming functions. For example:

```typescript file=./futures-2.ts
```

However, many programmers find this syntax a little more cumbersome to work with than should be reasonably expected. Therefore, all Futures emitted by mgFx are automatically augmented with the [Fluenture](https://github.com/fluture-js/fluenture) Fluent Interface. This allows the creation of elegant, expressive chains of execution. Here's a more complicated example:

```typescript file=./futures-3.ts
```

This above example touches on a powerful feature of mgFx; that of _Task Composition_. However, understanding this concept requires a rudimentary understanding of Futures and some very general patterns and use-cases, which will outline next.

## Patterns, Pitfalls and Tips
