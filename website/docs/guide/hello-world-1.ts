import * as mgFx from 'mgfx';

const connector = mgFx.localConnector();

const sayHello = mgFx.define({
  name: 'sayHello',
  input: mgFx.validate.string,
  output: mgFx.validate.string,
});

connector.run(sayHello('World'));
