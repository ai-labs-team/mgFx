import React from 'react';
import titleCase from 'title-case';

import { Execution } from '@common/types';
import { useInferredState } from 'hooks';

import './Summary.scss';

type Props = {
  execution: Execution
}

export const Summary: React.FunctionComponent<Props> = ({ execution }) => {
  const inferredState = useInferredState(execution);

  const startedAt = React.useMemo(
    () => execution.start ? new Date(execution.start).toISOString() : undefined,
    [execution.start]
  );

  const endedAt = React.useMemo(
    () => execution.end ? new Date(execution.end).toISOString() : undefined,
    [execution.start]
  );

  const duration = React.useMemo(
    () => execution.start && execution.end ? (execution.end - execution.start).toLocaleString() : undefined,
    [execution.start, execution.end]
  );

  return (
    <div className='panel-summary'>
      <p className='panel-summary-task-name'>{execution.task_name}</p>
      <p className='panel-summary-info'>
        <span className='panel-summary-label'>
          State
        </span>
        <span className='panel-summary-value'>
          <span className={`panel-summary-state panel-summary-state-${inferredState}`}>
            {titleCase(inferredState)}
          </span>
        </span>
      </p>
      {startedAt && (<p className='panel-summary-info'>
        <span className='panel-summary-label'>
          Started
        </span>
        <span className='panel-summary-value'>
          {startedAt}
        </span>
      </p>)}
      {endedAt && (<p className='panel-summary-info'>
        <span className='panel-summary-label'>
          Ended
        </span>
        <span className='panel-summary-value'>
          {endedAt}
        </span>
      </p>)}
      {duration && (
        <p className='panel-summary-info'>
          <span className='panel-summary-label'>
            Duration
          </span>
          <span className='panel-summary-value'>
            {duration} ms
          </span>
        </p>
      )}
    </div>
  );
};
