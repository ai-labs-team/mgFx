import { ioTs, t } from '@mgfx/validator-iots';
import { parallel } from 'fluture';
import { define, localConnector } from 'mgfx';

const enumerateParticipants = define({
  name: 'enumerateParticipants',
  input: ioTs(t.void),
  output: ioTs(t.array(t.string)),
});

const sayHello = define({
  name: 'sayHello',
  input: ioTs(t.string),
  output: ioTs(t.void),
});

const connector = localConnector();

connector
  .run(enumerateParticipants())
  .map((participants) =>
    // For each element in the list of 'participants', run the `sayHello` Task:
    participants.map((name) => connector.run(sayHello(name)))
  )
  // This returns a Future that resolves to an Array of Futures.
  // Let's perform that repeated unit of execution in parallel, with infinite
  // concurrency:
  .chain(parallel(Infinity))
  // Once they've all finished, 'fan in' and derive some aggregate result:
  .map((results) => results.length)
  // Finally, invoke this chain of execution, sending the final result to an
  // observer:
  .value((resultCount) => {
    console.info(`Greeted ${resultCount} participants.`);
  });
