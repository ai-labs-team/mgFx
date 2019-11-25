import { isMaster, fork, worker } from 'cluster';
import { cpus } from 'os';
import { IpcMaster, IpcWorker, Task, RoundRobin } from 'mgfx';
import { Timeout } from '@mgfx/tasks';
import Future, { after, FutureInstance } from 'fluture';

class GetWorkerPid extends Task<{}> {

  static handler(): FutureInstance<unknown, number> {
    return Future.of(worker.process.pid);
  }

  constructor() {
    super({ id: null, data: {} });
  }
}

if (isMaster) {
  const cpuCount = cpus().length;

  const scheduler = new IpcMaster({
    dispatchStrategy: new RoundRobin()
  });

  for (let i = 0; i < cpuCount; i += 1) {
    fork();

    after(1000, null)
      .chain(() => scheduler.exec(new GetWorkerPid({ id: null, data: {} })))
      .fork(
        (err: unknown) => console.error(`Could not get worker pid`, err),
        (pid: number) => { console.log(`Hello from pid ${pid}`) }
      );
  }
} else {
  new IpcWorker({
    concurrency: 1,
    tasks: [
      Timeout,
      GetWorkerPid
    ]
  });
}
