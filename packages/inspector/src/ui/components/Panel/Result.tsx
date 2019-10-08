import React from 'react';
import { ObjectInspector } from 'react-inspector';

import { Execution } from '@common/types';
import { useInferredState } from 'hooks';

import './Result.scss';

type Props = {
  execution: Execution;
}

export const Result: React.FunctionComponent<Props> = ({ execution }) => {
  const inferredState = useInferredState(execution);

  const content = React.useMemo(
    () => {
      const prefix = `Task '${execution.task_name}'`;
      const stateClass = `panel-result-state panel-result-state-${inferredState}`;

      if (inferredState === 'running') {
        return (
          <p className='panel-result-title'>
            {prefix} is <span className={stateClass}>still running</span>; no result available yet.
          </p>
        );
      }

      if (inferredState === 'cancelled') {
        return (
          <p className='panel-result-title'>
            {prefix} was <span className={stateClass}>cancelled</span>; no result available.
          </p>
        );
      }

      if (inferredState === 'rejected') {
        if (!execution.rejected_reason) {
          return (
            <p className='panel-result-title'>
              {prefix} <span className={stateClass}>rejected</span>, but no reason was given.
            </p>
          );
        }

        return (
          <>
            <p className='panel-result-title'>
              {prefix} <span className={stateClass}>rejected</span> with reason:
            </p>
            <ObjectInspector data={JSON.parse(execution.rejected_reason)} />
          </>
        );
      }

      if (inferredState === 'resolved') {
        if (!execution.resolved_value) {
          return (
            <p className='panel-result-title'>
              {prefix} <span className={stateClass}>resolved</span>, but no value was given.
            </p>
          );
        }

        return (
          <>
            <p className='panel-result-title'>
              {prefix} <span className={stateClass}>resolved</span> with value:
            </p>
            <ObjectInspector data={JSON.parse(execution.resolved_value)} />
          </>
        );
      }
    },
    [inferredState, execution.rejected_reason, execution.resolved_value]
  );

  return (
    <div className='panel-arguments'>
      {content}
    </div>
  );
}
