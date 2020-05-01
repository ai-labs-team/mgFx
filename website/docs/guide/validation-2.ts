import * as mgFx from 'mgfx';
// highlight-next-line
import { ioTs, t } from '@mgfx/validator-iots';

const connector = mgFx.localConnector();

const sayHello = mgFx.define({
  name: 'sayHello',
  // highlight-start
  input: ioTs(t.string),
  output: ioTs(t.string),
  // highlight-end
});

const sayHelloImplementation = mgFx.implement(sayHello, (name) => {
  // highlight-next-line
  return `Hello, ${name}!`;
});

connector.serve(sayHelloImplementation);

connector.run(sayHello('World')).fork(console.error, console.log);
