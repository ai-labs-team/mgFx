import { define, localConnector, validate } from 'mgfx';

const sayHello = define({
  name: 'sayHello',
  input: validate.string,
  output: validate.string,
});

localConnector()
  .run(sayHello('World'))
  // a `Future<any, string>`
  .map((greeting) => greeting.length)
  // now a `Future<any, number>`
  .value((result) => {
    // equivalent of `fork()`, but ignoring error 'branch'.
  });
