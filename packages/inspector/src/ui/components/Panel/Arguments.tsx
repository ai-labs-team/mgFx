import React from 'react';
import { ObjectInspector } from 'react-inspector';

import { Execution } from '@common/types';

import './Arguments.scss';

type Props = {
  execution: Execution;
}

export const Arguments: React.FunctionComponent<Props> = ({ execution }) => {
  const args = React.useMemo(() => JSON.parse(execution.args), [execution.args]);

  return (
    <div className='panel-arguments'>
      <p className='panel-arguments-title'>Task '{execution.task_name}' was invoked with arguments:</p>
      <ObjectInspector data={args} />
    </div>
  );
}
