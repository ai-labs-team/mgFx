import Future, { FutureInstance, Cancel } from 'fluture';
import { EventEmitter2 } from 'eventemitter2';
import uuid from 'uuid';

import { Context, Config as ContextConfig } from './Context';
import { DispatchStrategy } from './DispatchStrategy';
import { Serializable, SerializableArray } from './Serializable';

export type Config = {
  dispatchStrategy: DispatchStrategy
}

export type Message = {
  event: string | string[];
  args: any[];
}

export type Request = {
  name: string;
  id: string;
  args: any[];
}

export type Response = {
  id: string;
  value: any;
}

export type ExecutorState = {
  tasks: string[];
}

export type ExecutorStateMap = Map<string, ExecutorState>;

export type ExecutionHandle = {
  parentId?: string;
  contextId?: string;
  taskName: string;
  args: any[];
}

type ExecutionHandleMap = Map<string, ExecutionHandle>;

type ExecutionState =
  | { phase: 'pending' }
  | { phase: 'dispatching', executorId: string }
  | { phase: 'executing', executorId: string }
  | { phase: 'resolved', value: Serializable }
  | { phase: 'rejected', reason: Serializable }
  | { phase: 'cancelled' }

type ExecutionStateMap = Map<string, ExecutionState>;

export type ExecutionObserverMap = Map<string, [(value: any) => void, (reason: any) => void]>;

type EnqueueOptions = {
  id: string;
  dispatch: boolean;
}

export abstract class Scheduler extends EventEmitter2 {

  protected _executors: ExecutorStateMap = new Map();

  protected _executions: ExecutionHandleMap = new Map();

  protected _executionStates: ExecutionStateMap = new Map();

  protected _executionObservers: ExecutionObserverMap = new Map();

  protected _willDispatchOnNextTick = false;

  protected _injected: Array<any> = [];

  constructor(protected readonly _config: Config) {
    super({
      wildcard: true
    });
  }

  /**
   * Enqueue the execution of a Task according to the Execution Spec given by `spec`.
   *
   * A number of `options` are also available to customise the execution semantics:
   * - `id` - An explicit unique identifier for this execution. Internally this is used to allow Tasks that
   *    execute their own 'child' Tasks to correctly track the execution of that child. Users should not explicitly
   *    set this unless they can guaratee that the ID generated will be unique.
   * - `dispatch` - Determines whether the execution of this Task (and any other pending Tasks) should be dispatched.
   *   Defaults to `true`, but if explicitly set to `false`, execution will remain in the `pending` state until a
   *   dispatch occurs elsewhere.
   *   (this is probably a dumb option to expose since there's no use for it internally, multiple dispatch calls are already batched together and you don't really get much control over when or how somebody else triggers a dispatch)
   */
  public enqueue<Err extends any, Val extends any>(spec: ExecutionHandle, options: Partial<EnqueueOptions> = {}): FutureInstance<Err, Val> {
    const { id = uuid(), dispatch = true } = options;

    this._executions.set(id, spec);
    this._executionStates.set(id, { phase: 'pending' });

    this.emit(['enqueued', id], id, spec);

    const future = new Future<Err, Val>((reject, resolve) => {
      this._executionObservers.set(id, [resolve, reject]);
      return (() => { this._cancel(id); });
    }).finally(new Future((_, resolve) => {
      this._executionObservers.delete(id);
      resolve(null);
    }));


    if (dispatch) {
      this._dispatchPending();
    }

    return future;
  }

  public inject<T>(task: T) {
    this._injected.push(task);

    return this;
  }

  public reset() {
    this._injected = [];
  }

  public createContext(config: Omit<ContextConfig, 'scheduler'>) {
    return new Context({
      ...config,
      scheduler: this
    });
  }

  protected _receive(message: Message, senderId: string) {
    this.emit(['received'].concat(message.event), ...message.args);

    if (message.event === 'ready') {
      this._registerExecutor(message.args[0], {
        tasks: message.args[1]
      });
    }

    if (message.event[0] === 'executing') {
      const [handleId] = message.args;

      const currentState = this._executionStates.get(handleId);
      // ick. prevent late messages from clobbering status of already settled task
      if (currentState && currentState.phase === 'dispatching') {
        this._executionStates.set(handleId, {
          phase: 'executing',
          executorId: senderId
        });
      }

      this.emit(['executing', handleId], handleId, senderId);
    }

    if (message.event[0] === 'resolved') {
      const [handleId, value] = message.args;

      if (this._executionStates.has(handleId)) {
        this._executionStates.set(handleId, {
          phase: 'resolved',
          value
        });
      }

      if (this._executionObservers.has(handleId)) {
        const [resolve] = this._executionObservers.get(handleId)!;
        resolve(value);
      }

      this.emit(['resolved', handleId], handleId, value);
      // re-broadcast resolved state to all executors in case they have tasks that emitted this task as child
      // @todo: Track this better -- only send messages to executors that care
      this._broadcast(message);
    }

    if (message.event[0] === 'rejected') {
      const [handleId, reason] = message.args;

      if (this._executionStates.has(handleId)) {
        this._executionStates.set(handleId, {
          phase: 'rejected',
          reason
        });
      }

      if (this._executionObservers.has(handleId)) {
        const [, reject] = this._executionObservers.get(handleId)!;
        reject(reason);
      }

      this.emit(['rejected', handleId], handleId, reason);
      // @todo: same as resolve
      this._broadcast(message);
    }

    if (message.event[0] === 'execChild') {
      const [id, parentId, taskName, args] = message.args;

      const parent = this._executions.get(parentId);

      this.enqueue({
        contextId: parent ? parent.contextId : undefined,
        parentId,
        taskName,
        args
      }, { id });
    }
  }

  protected _cancel(id: string) {
    const currentState = this._executionStates.get(id);

    if (!currentState) {
      return;
    }

    // Task execution hasn't been dispatched yet, can be cancelled immediately
    if (currentState.phase === 'pending') {
      this._executionStates.set(id, { phase: 'cancelled' });
      this.emit(['cancelled', id], id);
      return;
    }

    // Task execution has already settled; can't cancel
    if (!('executorId' in currentState)) {
      return;
    }

    // Task is being dispatched or executed; ask the executor to cancel it and hope for the best.
    const { executorId } = currentState;
    // @todo (maybe) - distinguish between 'cancelling' and 'cancelled'
    this._executionStates.set(id, { phase: 'cancelled' });
    this.emit(['cancelled', id], id);

    this._send(executorId, {
      event: ['cancel', id],
      args: [id]
    });
  }

  protected _dispatchPending() {
    if (this._willDispatchOnNextTick) {
      return;
    }
    this._willDispatchOnNextTick = true;

    setImmediate(() => {
      for (const [id, handle] of this._executionStates) {
        if (handle.phase !== 'pending') {
          continue;
        }

        this._dispatch(id);
      };

      this._willDispatchOnNextTick = false;
    })
  }

  /**
   * Retrieves an Execution Handle with the given ID and dispatches the Task name and arguments to the next available Executor, chosen by the configured `dispatchStrategy`.
   *
   * If a matching Task was given using the `inject` method, then the task will be marked as `resolved` with that value,
   * and the Task will *not* be dispatched to an Executor.
   */
  protected _dispatch(handleId: string) {
    const { taskName, args } = this._executions.get(handleId)!;

    if (this._tryReplay(handleId, taskName, args)) {
      return;
    }

    const executorId = this._config.dispatchStrategy.choose(taskName, this._executors);

    if (!executorId) {
      return;
    }

    this._executionStates.set(handleId, {
      phase: 'dispatching',
      executorId
    })

    this.emit(['dispatching', handleId], handleId, executorId);

    this._send(executorId, {
      event: 'execute',
      args: [
        handleId,
        taskName,
        args
      ]
    });
  }

  protected _tryReplay(handleId: string, taskName: string, args: SerializableArray) {
    const index = this._injected.findIndex(injected => injected[0].name === taskName);

    if (index < 0) {
      return false;
    }

    const [, value] = this._injected[index];

    this._injected.splice(index, 1);

    // @hack - should extract the resolution handling logic to a method instead
    this._receive({
      event: ['resolved'],
      args: [handleId, value]
    }, '_self');

    return true;
  }

  protected _registerExecutor(id: string, state: ExecutorState) {
    this._executors.set(id, state);
    this.emit(['executor', 'registered'], id);

    this._dispatchPending();
  }

  protected _unregisterExecutor(id: string) {
    const existed = this._executors.delete(id);

    // don't emit if the executor didn't exist anyway
    if (existed) {
      this.emit(['executor', 'unregistered', id], id);
    }
  }

  protected abstract _broadcast(message: Message): void;

  protected abstract _send(executorId: string, message: Message): void;
}
