import * as mgFx from 'mgfx';

const connector = mgFx.localConnector();

const sayHello = mgFx.define({
  name: 'sayHello',
  input: mgFx.validate.string,
  output: mgFx.validate.string,
});

// highlight-start
const sayHelloImplementation = mgFx.implement(sayHello, (name) => {
  return 99 as any;
});
// highlight-end

connector.serve(sayHelloImplementation);

connector.run(sayHello('World')).fork(console.error, console.log);
