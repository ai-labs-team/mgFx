import { DispatchStrategy } from '../DispatchStrategy';
import { ExecutorStateMap } from '../Scheduler';

export class RoundRobin extends DispatchStrategy {
  protected _lastIdIndex: number = 0;

  choose(taskName: string, executorStates: ExecutorStateMap) {
    const ids = this._eligibleIds(taskName, executorStates);
    const id = ids[this._lastIdIndex];

    this._lastIdIndex = this._lastIdIndex < ids.length - 1 ? this._lastIdIndex + 1 : 0;

    return id;
  }
}
