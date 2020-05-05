---
title: Getting Started
---

This guide will demonstrate the key concepts of mgFx and how to make use of them. We'll introduce and examine each set of concepts in each chapter, starting with the basics.

In this first chapter we shall:

- Initialize a TypeScript-based project with the mgFx core installed.
- Create an mgFx Connector, Task Definition/Implementation, wire them together and try them out.
- Give an introduction to each of these components and some of mgFx's functionality.

## Project Setup

First, let's set up a brand new NodeJS application:

```bash npm2yarn
mkdir hello-mgfx
cd hello-mgfx
npm init -y
```

Then, we'll install the core mgFx package and some other dependencies. We strongly recommend pairing mgFx with TypeScript (although not strictly required).

```bash npm2yarn
npm install mgfx typescript ts-node
```

Let's start writing some code! Create a new file named `hello-world.ts` in your favourite editor and type the following:

```typescript file=./hello-world-1.ts
```

Before we continue, let's take the time to look at each part of this file, why they're there, and what the underlying concepts are...

## Basic Concepts

### Connector

First, we create a _Connector_ using `mgFx.localConnector()`:

```typescript
const connector = mgFx.localConnector();
```

A _Connector_ is, as the name might suggest, the way in which you connect your beautiful, clean application to the nasty, unpredictable world of Side Effects.

The `localConnector` function exported by the `mgfx` module returns a Connector that is suitable for working within the context of a single ('local') NodeJS process.

Other Connector implementations may provide different functionality, such as the ability to work across multiple OS processes, different systems, or even different programming languages. But we'll explore those in the later, more advanced chapters of this guide.

### Task Definition

Next, we create a _Task Definition_ using `mgFx.define()`:

```typescript
const sayHello = mgFx.define({
  name: 'sayHello',
  input: mgFx.validate.string,
  output: mgFx.validate.string,
});
```

A _Task Definition_ provides a formal 'contract' regarding a _Task_. Tasks are how mgFx encapsulates behaviour that depends on and/or mutates _State_ in the 'outside world' - a _Side Effect_. Good examples of Tasks that encapsulate Side Effects would include:

- Modifying a file on disk.
- Making an HTTP Request.
- Executing a Database query.

In most cases, a Task depends on some _Input_ parameters. For example, given the above examples, some typical Inputs
might be:

- The _path_ to a file on disk.
- The _URL_ and _method_ of an HTTP Request.
- The _parameters_ to bind to a pre-prepared SQL query.

In addition, it's common for Tasks to return some _Output_, such as:

- The _contents_ of a file.
- The _response body_ of an HTTP Request.
- The _results_ returned by a query.

Observe that the _Spec_ object passed into `mgFx.define()` has `input` and `output` properties. The properties are _Validator_ functions that ensure:

- Tasks are only executed when a given Input is valid.
- Tasks that return invalid Output will automatically throw an error.

mgFx enforces these validation constraints at both _design time_ **and** _run time_.

We'll discuss Validation and types more in the next chapter, but for now observe that we use the built-in `mgFx.validate.string` to declare a Task that accepts a String as both Input and Output.

Finally, we specify a unique name for this Task Definition via the `name` field of the Spec object and assign it to `myTask`.

:::caution
Task Definition names should be unique across your project, but it doesn't matter what you name the _variable_ your definition is assigned to (`const sayHello` in this case.)

We're not too keen on this pattern and are looking for a simple but effective way of inferring the `name` property based upon assignment, but don't have a solution _yet_.
:::

### Running a Task

Finally, we may instruct the Connector to _run_ the Task as defined in `sayHello` using `connector.run()`:

```typescript
connector.run(sayHello('World'));
```

Notice that the Task Definition created by `mgFx.define()` previously returns a Function. Calling this Function creates a _Process_ object which we may feed directly into `connector.run()`.

We'll talk more about Process objects in a later chapter, but in most cases you'll want to pass a Process directly into a Connector.

## Go Time!

Let's use the `ts-node` dependency we installed earlier to run our TypeScript file directly:

```bash
$ ./node_modules/.bin/ts-node hello-world.ts
$
```

You may be surprised or underwhelmed to realise that running this script appears to have done absolutely nothing. This is because mgFx's execution model is _lazy_. Calling `connector.run()` _prepares_ a Task for execution, won't actually execute anything until we `.fork()`.

Modify the end of `hello-world.ts` so that it looks like this:

```typescript file=./hello-world-2.ts
```

Notice that we take the result of calling `connector.run()` and then call the `fork()` fluent method. We'll talk more about this fluent interface and the `fork()` method in the next chapter, but for now accept that:

- `fork()` accepts exactly two parameters
- The first parameter passed to `fork()` will receive any error that occurred while processing the Task.
- The second parameter will receive the Output that the Task returned after completing successfully.
- Calling `fork()` will begin Task execution proper.

Let's try running our file again:

```
$ ./node_modules/.bin/ts-node hello-world.ts

NoImplementationError: No Implementation for sayHello was found. Did you forget to call serve()?
```

We're moving in _some_ direction now, but our Connector is throwing a `NoImplementationError`. This is because we've told the Connector _which_ Task to run, but not _what_ that Task should actually do. For that, we need to provide an Implementation...

## Writing a Task Implementation

In order for mgFx to actually perform a Task, we need to:

- Create an Implementation for an existing Task Definition
- Instruct the Connector to 'serve' that Implementation

Modify `hello-world.ts` so that it looks like this:

```typescript file=./hello-world-3.ts
```

First, we use `mgFx.implement()` to create a _Task Implementation_ - notice that we pass in the Task Definition of `sayHello` as the first parameter, and the Function that will _perform_ this Task as the second parameter.

Finally, we use `connector.serve()` to allow our Connector to use this Implementation whenever we attempt to run the `sayHello` task.

Once again, for the third time, let's attempt to run this file:

```
$ ./node_modules/.bin/ts-node hello-world.ts
Hello, World!
```

Success! Our Task was successfully executed using the string `'World'` as it's input. The Task then returned the String `'Hello, World!` as it's output, and was passed to the second parameter of `fork()` -- `console.log`.

## Conclusions

In this first chapter we covered:

- How to install the mgFx core into an application.
- How to create a Connector, Task Definition and Implementation, and a brief discussion of these primitives.
- How to tell a Connector to _run_ a Definition and how to _serve_ an Implementation.
- mgFx's _lazy_ execution model, and the need for `fork()`.

You may now be asking these questions:

- Why the separation between Task Definitions and Implementations?
- Why is mgFx lazy; why do I need to `fork()` at all?
- `console.log` is barely a Side Effect at all! When do we get to see something real?

Over the subsequent chapters, we'll incrementally increase the complexity and attempt to answer these questions and more.
