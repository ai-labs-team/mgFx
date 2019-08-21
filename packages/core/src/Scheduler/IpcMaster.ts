import cluster, { Worker } from 'cluster';

import { Config, Scheduler, Message } from '../Scheduler';

export class IpcMaster extends Scheduler {

  constructor(protected readonly _config: Config) {
    super(_config);

    cluster.on('message', (worker, message) => this._receive(message, worker.id + ''));

    // Watch disconnect *and* exit to catch cases where worker dies unexpectedly
    cluster.on('disconnect', worker => this._unregisterExecutor(worker.id + ''));
    cluster.on('exit', worker => this._unregisterExecutor(worker.id + ''));
  }

  protected _broadcast(message: Message) {
    this._forEachWorker(worker => {
      worker.send(message);
    });
  }

  protected _send(executorId: string, message: Message) {
    const worker = cluster.workers[executorId];

    if (!worker) {
      console.warn(`Failed to send message to unknown executor '${executorId}'`);
      return;
    }

    worker.send(message);
  }

  protected _forEachWorker(fn: (worker: Worker) => void) {
    for (const workerId in cluster.workers) {
      const worker = cluster.workers[workerId];
      worker && fn(worker);
    }
  }
}
