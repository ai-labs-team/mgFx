import { define, localConnector, validate } from 'mgfx';
import { map, value } from 'fluture';

const sayHello = define({
  name: 'sayHello',
  input: validate.string,
  output: validate.string,
});

localConnector()
  // a `Future<any, string>`
  .run(sayHello('World'))
  // now a `Future<any, number>`
  .pipe(map((value) => value.length))
  // equivalent of `fork()`, but ignoring error 'branch'.
  .pipe(value(console.info));

// Is the equivalent of:
value(console.info)(
  map((value) => value.length)(localConnector().run(sayHello('World')))
);
