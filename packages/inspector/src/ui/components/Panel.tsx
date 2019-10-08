import React from 'react';
import { NavLink, Route, useParams } from 'react-router-dom';
import usePromise from 'react-use-promise';
import { serializeError } from 'serialize-error';

import { Params } from '@components/Inspector';
import { Execution } from '@common/types';
import { Summary } from './Panel/Summary';
import { Arguments } from './Panel/Arguments';
import { Result } from './Panel/Result';

import './Panel.scss';

export const Panel: React.FunctionComponent = () => {
  const params = useParams<Params>();

  const [execution, error, state] = usePromise<Execution>(
    () => {
      if (!params.selectedId) {
        return Promise.resolve({});
      }

      return fetch(`/api/executions/${params.selectedId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(response.statusText);
          }

          return response.json();
        })
    },
    [params.selectedId]
  );

  if (!params.selectedId) {
    return (
      <div className='panel'></div>
    );
  }

  if (state === 'pending') {
    return (
      <div className='panel'>
        <div className='toolbar' />
        <div className='panel-loading'>
          <p className='panel-loading-title'>Loading Execution data...</p>
        </div>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div className='panel'>
        <div className='toolbar' />
        <div className='panel-error'>
          <p className='panel-error-title'>Failed to load Execution data:</p>
          <pre className='panel-error-content'>{JSON.stringify(serializeError(error), null, 2)}</pre>
        </div>
        <p className='panel-error'></p>
      </div>
    );
  }

  const { span, selectedId } = params;

  return (
    <div className='panel'>
      <div className='toolbar panel-tabs'>
        <NavLink exact to={`/timeline/${span}/${selectedId}`}>
          Summary
        </NavLink>
        <NavLink to={`/timeline/${span}/${selectedId}/arguments`}>
          Arguments
        </NavLink>
        <NavLink to={`/timeline/${span}/${selectedId}/result`}>
          Result
        </NavLink>
      </div>
      <div className='panel-content'>
        <Route exact path='/timeline/:span/:selectedId'>
          <Summary execution={execution} />
        </Route>
        <Route path='/timeline/:span/:selectedId/arguments'>
          <Arguments execution={execution} />
        </Route>
        <Route path='/timeline/:span/:selectedId/result'>
          <Result execution={execution} />
        </Route>
      </div>
    </div>
  )
}
