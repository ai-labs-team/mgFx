import * as mgFx from 'mgfx';

const connector = mgFx.localConnector();

const sayHello = mgFx.define({
  name: 'sayHello',
  input: mgFx.validate.string,
  output: mgFx.validate.string,
});

// highlight-start
const sayHelloImplementation = mgFx.implement(sayHello, (name) => {
  return `Hello, ${name}!`;
});

connector.serve(sayHelloImplementation);
// highlight-end

connector.run(sayHello('World')).fork(console.error, console.log);
