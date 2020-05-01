---
title: Validation
---

In the last chapter, we created a Task Definition that uses the built-in `mgFx.validate.void` Validator to express that our Task is void of Input or Output. Let's take a moment to 'poke' at this Definition some more to learn about how mgFx enforces your constraints at both design-time and run-time.

First, attempt to violate the Input constraint at design-time by specifying a parameter when running the Task:

```typescript
// Argument of type '99' is not assignable to parameter of type 'string'.
connector.run(sayHello(99)).fork(console.error, console.log);
```

Then, attempt to violate the Output constraint at design-time by attempting to return a value from within the Task Implementation:

```typescript
// Type 'number' is not assignable to type 'string | FutureInstance<any, string>'.
const sayHelloImplementation = mgFx.implement(sayHello, () => {
  return 99;
});
```

The TypeScript types used by mgFx have been carefully constructed to ensure that strong type-checking is presented to programmers in the most useful, accurate and insightful manner possible. For the sake of argument, let's throw all that work into the wind in order to test how these constraints are enforced at run-time. Use the dreaded `as any` type assertion to force TypeScript to ignore an intentional error:

```typescript file=./validation-1.ts
```

Observe that mgFx will still catch this error at runtime:

```
$ ./node_modules/.bin/ts-node hello-world.ts
OutputValidationError:
{
    errors: '99 is not a string!'
}
```

By being consistently strict about types, mgFx applications are very robust. This is especially true for applications which involve interacting with data provided by third parties over which you have little or no control -- "Hell is other people('s data)."

## Validation in Depth

If you examine the Validators that are built into the mgFx core, you will that they only offer validation of simple types - strings, numbers and `void`. Any 'real' application is going to require far more than this; indeed, the mgFx core only provides these validators as a means of getting up-and-running quickly.

Although the mgFx core provides the mechanism for enforcing constraints described by Validators, the Validators themselves are extremely pluggable. We provide an additional module named `@mgfx/validator-iots` that allows the use of the [io-ts](https://github.com/gcanti/io-ts) library to check more complex types.

Let's install `@mgfx/validator-iots` into our application:

```bash npm2yarn
npm install @mgfx/validator-iots
```

Then, we'll import `ioTs` and `t` from this module. While we're in here, let's restore a working implementation for `sayHello`:

```typescript file=./validation-2.ts
```

Here, we are using the `ioTs` function to 'wrap' an io-ts validator (re-exported as `t` for convenience) as an mgFx compatible one. Of course, the astute will notice that `ioTs(t.string)` is essentially the equivalent of `mgFx.validate.string`. However, `t` provides a plethora of 'combinators' that map well to their TypeScript equivalents.

As previously mentioned, mgFx's Validators are extremely pluggable; you are welcome to write adapters for other libraries (such as [Zod](https://github.com/vriad/zod) or [TS Utils Decoder](https://github.com/ai-labs-team/ts-utils#decoder).) It is even possible to write extremely specific Validators for high-performance applications.

For now, let's take a look at how one might write a Task Definition for a slightly more complex type:

```typescript
mgFx.define({
  name: 'reticulateSplines',
  input: ioTs(
    t.array(
      t.type({
        timeout: t.number,
        precision: t.union([t.literal('high'), t.literal('low')]),
        spline: t.number,
      })
    )
  ),
  output: ioTs(
    t.array(
      t.type({
        spline: t.number,
        timeTaken: t.number,
        result: t.union([t.literal('volatile'), t.literal('safe')]),
      })
    )
  ),
});
```
