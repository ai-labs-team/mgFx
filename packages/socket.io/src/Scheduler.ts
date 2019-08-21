import io, { Server } from 'socket.io';
import * as base from 'mgfx/dist/Scheduler';

export type Config = base.Config & {
  port: number;
}

export class Scheduler extends base.Scheduler {
  protected _server: Server;

  constructor(protected readonly _config: Config) {
    super(_config);

    this._server = io(_config.port);

    this._server.on('connection', socket => {
      socket.on('message', message => {
        this._receive(message, socket.id);
      });

      // Watch disconnect *and* exit to catch cases where worker dies unexpectedly
      socket.on('disconnect', () => this._unregisterExecutor(socket.id))
      socket.on('disconnecting', () => this._unregisterExecutor(socket.id))
    });
  }

  protected _broadcast(message: base.Message) {
    this._server.send(message);
  }

  protected _send(executorId: string, message: base.Message) {
    this._server.to(executorId).send(message);
  }
}
