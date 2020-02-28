// Welcome to the guide tour of mgFx. In this tour, we will use some practical examples of the power of versatility
// afforded by mgFx in building complex systems that require interaction with the 'outside world' (ie, 'side effects'.)

// To get us started, let's just import everything from the `mgfx` module:
import * as mgFx from 'mgfx';

// We shall begin by looking at the basics. At the heart of mgFx is the 'Connector'. The Connector is the bridge between
// your Application and mgFx. The Connector is responsible for running processes, tracking their execution, and
// notifying the application when process complete (either successfully or unsuccesfully.)

// For the first few chapters of this Tour, we'll use the 'local' connector, so-called because it is only capable of
// running a Process within the current NodeJS application. However, there are also Connectors available which support
// distributed processing across many systems. But more on those later...
const connector = mgFx.localConnector();

// Another fundamental concept of mgFx is that of a 'Task' - a Task encapsulates some computation that may require
// interaction with the real world, such as reading or writing to a third-party API.

// For now, we'll use `mgFx.define()` to define a Task that tells us the Unix timestamp. Observe that the `define`
// function accepts an object known as a 'Spec' object that requires at least the following properties:
//
// - `name` - A unique name to identify this Task.
// - `input` - A 'validator' function that ensures that any data being passed to this Task as Input is valid, before
//    attempting to run that Task.
// - `output` - Another 'validator' function that ensures that the data produced by the Task when it completes is valid.
//
// We'll discuss input/output validation futher in the next chapter; for now, take it as a given that this Task requires
// no input (ie, void) and should be expected to produce an output value of type `number`.
const timestamp = mgFx.define({
  name: 'timestamp',
  input: mgFx.validate.void,
  output: mgFx.validate.number
});

// Observe our Task definition is simply that; a definition. It carries no information about *how* to perform that Task.
// To provide an 'implementation' for a Task, we need to use `mgFx.implement()`:
const tsImpl = mgFx.implement(timestamp, () => Math.floor(Date.now() / 1000));

// Now that we have an implementation of this Task ready to go, we can 'serve' it via our Connector:
connector.serve(tsImpl);

// Now we're ready to run our Task: `mgFx.define()` returns a _function_ that we can use to create a 'Process' object
// that should run our Task:
const process = timestamp();

// A Process encapsulates the information required by mgFx to attempt to run a Task, such as the Task's unique name, and
// any input that was explicitly supplied to it. That Process can then be passed to `connector.run()`, which will cause
// the mgFx connector to attempt to locate an Implementation of the requested Task, run it with the given input, and
// return the Tasks's output:
const run = connector.run(process);

// `connector.run` uses [Fluture](https://github.com/fluture-js/Fluture) to represent the eventual success (or failure)
// of a Task. Futures are inherently 'lazy' - to actually begin execution, we must pass it to a function that can 'fork'
// the Future, such as `fluture.fork` or `mgFx.fork.toConsole`:
mgFx.fork.toConsole(run);

// All that assignment to variables is a little messy; we can probably clean this up some via `Future#pipe()`:
timestamp()
  .pipe(connector.run)
  .pipe(mgFx.fork.toConsole);

// That will conclude the first chapter. At this point, you may be asking yourself questions like:
//
// - "Why bother validating input and output of such a simple task?"
// - "That's just a fancy wrapper around `Date.now()` - where are the side effects!?"
// - "Why is running a Task so laborious?"
// - "Why are Definitions and Implementations two different things?"
//
// Those are all great questions - and ones that will be answered in the subsequent chapters of this Tour. In the next
// chapter, we'll look at I/O Validation in more detail.
