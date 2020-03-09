import jsonServer from 'json-server';
import { join } from 'path';
// @ts-ignore
import _chaos from 'chaos-middleware';
// @ts-ignore
import pause from 'connect-pause';

import { bridge } from './bridge';

const server = jsonServer.create();
const middleware = jsonServer.defaults();

const fixturedApp = (name: string) =>
  jsonServer.router(join(__dirname, 'fixtures', `${name}.json`), {
    foreignKeySuffix: '_id'
  });

const chaos = _chaos({
  probability: 0.5,
  rules: [
    { event: 'httpStatus', params: 500 },
    { event: 'delay', params: 5000 },
    { event: 'close' },
    { event: 'throwError', params: 'Some random synthetic error' }
  ]
});

server
  .use(middleware)
  // The 'Core' service is one which we consider to be in control of; it has low latency and jitter, and response data
  // usually conforms to structures we expect.
  .use('/core', pause(200), fixturedApp('core'))
  // The 'Bridge' service is also one is our control; it is an Express app that is responsible for moving data back and
  // forth between our Core service and external services.
  .use('/bridge', bridge)
  // The 'external' services are ones operated by third parties and we have little direct control over. They may have
  // high latency and jitter, and response data may not always conform to what we expect.
  // ("Hell is other people's data")
  .use('/external/bankA', pause(1000), chaos, fixturedApp('bankA'))
  .use('/external/bankB', pause(1000), chaos, fixturedApp('bankB'))
  .use('/external/bankC', pause(1000), chaos, fixturedApp('bankC'));

server.listen(process.env.HTTP_PORT || 8080, () => {
  console.log('Kitchen Sink Server is running');
});
