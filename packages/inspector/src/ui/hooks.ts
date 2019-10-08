import { useMemo, useCallback } from 'react';
import { useHistory, useRouteMatch } from 'react-router';
import pathToRegexp from 'path-to-regexp';

import { Execution } from '@common/types';

export type State =
  'not-started' |
  'running' |
  'cancelled' |
  'rejected' |
  'resolved';

export const useInferredState = (execution: Execution): State =>
  useMemo(
    () => {
      if (execution.start === null) {
        return 'not-started';
      }

      if (execution.end === null) {
        return 'running';
      }

      if (execution.cancelled_at !== null) {
        return 'cancelled';
      }

      if (execution.rejected_at !== null) {
        return 'rejected';
      }

      return 'resolved';
    },
    [execution.start, execution.end]
  );

export const useParamUpdater = <T extends {}>() => {
  const history = useHistory();
  const match = useRouteMatch<T>()!;

  return useCallback(
    (newParams: T) => {
      const toPath = pathToRegexp.compile(match.path);
      const newPath = toPath({
        ...match.params,
        ...newParams
      })

      history.replace(newPath);
    },
    [match.path, match.params]
  );
}
