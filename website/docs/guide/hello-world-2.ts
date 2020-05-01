import * as mgFx from 'mgfx';

const connector = mgFx.localConnector();

const sayHello = mgFx.define({
  name: 'sayHello',
  input: mgFx.validate.string,
  output: mgFx.validate.string,
});

// highlight-next-line
connector.run(sayHello('World')).fork(console.error, console.log);
