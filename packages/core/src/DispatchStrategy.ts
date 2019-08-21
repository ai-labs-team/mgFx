import { ExecutorStateMap } from './Scheduler';

export abstract class DispatchStrategy {
  public abstract choose(taskName: string, executorStates: ExecutorStateMap): string | undefined;

  protected _eligibleIds(taskName: string, executorStates: ExecutorStateMap): string[] {
    const ids: string[] = [];

    for (const [id, state] of executorStates) {
      if (state.tasks.includes(taskName)) {
        ids.push(id);
      }
    }

    return ids;
  }
}
