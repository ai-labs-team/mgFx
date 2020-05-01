---
title: Introduction
---

mgFx is a suite of libraries and tools that improve the way that programmers think about and write applications that interact with the 'outside world' (_Side Effects_.)

Due to their nature of being highly dependent on factors beyond our own control, Side Effects can be incredibly difficult to reason about and predict. This is especially true in large and/or distributed systems.

The libraries and tools provided by mgFx provide the following crucial features:

- **Developers First**

  - The [Getting Started](./guide/getting-started.md) guide will get you understanding mgFx in 15 minutes.
  - Assemble complex behaviours quickly, and with less cognitive burden.
  - Tools and libraries to help close the development loop
    - Model, replay and study logic dependent on external state.
    - Write better, more expressive tests.

- **Design by Contract**

  - Write clear, well-defined boundaries between the different aspects of your application.
  - Strongly-typed Task specifications provide robust, predictable and ergonomic typechecking at design-time _and_ run-time.

- **Ideal for Distributed Applications**

  - A simple messaging model allows Side-Effecting behaviour to be implemented across system boundaries with minimal effort.
  - Avoid potentially complex concepts such as pub/sub, queuing and Actor-like patterns.
  - Revolutionary tracing, debugging and analytical capabilities.

- **Lightweight and adaptable**
  - Little technical or philosophical overhead.
  - Assemble a stack of mgFx components that suits your exact needs.
  - Simple plugin architecture gives full control to power users.
