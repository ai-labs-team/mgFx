import { isMaster, fork, worker } from 'cluster';
import { cpus } from 'os';
import { IpcMaster, IpcWorker, Task, RoundRobin } from 'mgfx';
import { Timeout } from '@mgfx/tasks';

class GetWorkerPid extends Task<number> {
  run() {
    this.resolve(worker.process.pid);
  }
}

if (isMaster) {
  const cpuCount = cpus().length;

  const scheduler = new IpcMaster({
    dispatchStrategy: new RoundRobin()
  });

  for (let i = 0; i < cpuCount; i += 1) {
    fork();

    scheduler.exec(Timeout, 100)
      .then(() => scheduler.exec(GetWorkerPid))
      .then(pid => console.log(`Hello from pid ${pid}`));
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
