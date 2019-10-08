import React from 'react';
import classNames from 'classnames';
import { useDebouncedCallback } from 'use-debounce';
import { useParams } from 'react-router-dom';
import pathToRegexp from 'path-to-regexp';
import * as vis from 'vis-timeline';

import 'vis-timeline/dist/vis-timeline-graph2d.css';

import { Params } from '@components/Inspector';
import { Context, ContextTiming, Execution } from '@common/types';
import { useParamUpdater } from 'hooks';
import * as utils from './Timeline/utils';

import './Timeline.scss';

const DEFAULT_TIMESPAN = 60 * 60 * 1000;
const DEBOUNCE_DELAY = 300;

export const Timeline: React.FunctionComponent = () => {
  const params = useParams<Params>();
  const updateParams = useParamUpdater<Params>();

  const [[start, end], setSpan] = React.useState(() => utils.initialSpan(params.span, DEFAULT_TIMESPAN));
  const [selectedId, setSelectedId] = React.useState(params.selectedId);

  const [loading, setLoading] = React.useState(false);

  const [fetchData, cancelFetch] = useDebouncedCallback(
    (start: number, end: number) => {
      const { result, abort } = utils.fetchData(start, end);

      result
        .then(([contexts, timings, executions]) => {
          timeline.current!.setData({
            items: new vis.DataSet([
              ...utils.executionItems(executions),
              ...utils.timingItems(timings),
              ...utils.boundaryItems(start, end)
            ]),

            groups: new vis.DataSet(utils.contextGroups(contexts))
          });

          if (selectedId) {
            timeline.current!.setSelection(selectedId);
          }

          setLoading(false);
        })
        .catch(() => setLoading(false));

      return () => {
        cancelFetch();
        abort();
      }
    },
    DEBOUNCE_DELAY,
  );

  const container = React.useRef<HTMLDivElement>(null);
  const timeline = React.useRef<vis.Timeline | null>(null);

  React.useEffect(
    () => {
      setLoading(true);
      updateParams({ span: `${start}-${end}` });
      return fetchData(start, end);
    },
    [start, end]
  );

  React.useEffect(
    () => {
      updateParams({ selectedId, panel: selectedId ? params.panel : undefined });
    },
    [selectedId]
  );

  React.useEffect(
    () => {
      console.info('Creating Timeline component');

      timeline.current = new vis.Timeline(container.current!, [], {
        width: '100vw',
        height: '100%',
        order: (a, b) => {
          return a.order - b.order;
        },
        orientation: {
          item: 'top'
        },
        margin: {
          item: {
            horizontal: 0,
          }
        },
        locale: 'en',
        start,
        end
      });

      timeline.current!.on('rangechanged', ({ start, end, byUser }: { start: Date, end: Date, byUser: boolean }) => {
        if (!byUser) {
          return;
        }

        setSpan([start.getTime(), end.getTime()]);
      });

      timeline.current!.on('select', ({ items }) => {
        setSelectedId(items.length ? items[0] : undefined);
      });

      (window as any).FOLLOW = () => {
        timeline.current!.setOptions({
          rollingMode: {
            follow: true
          }
        });

        setInterval(() => {
          const { start, end } = timeline.current!.getWindow();
          setSpan([start.getTime(), end.getTime()]);
        }, 1000);
      }

      return () => {
        console.info('Destroying Timeline component');
        timeline.current!.destroy();
      }
    },
    [container]
  );

  return (
    <>
      <div className='timeline' ref={container} />
    </>
  );
};
