import { DataItem, DataGroup } from 'vis-timeline';
import classNames from 'classnames';

import { Context, ContextTiming, Execution } from '@common/types';

export const prettifyLabels = (labels: string): string => {
  try {
    const parsed = JSON.parse(labels);

    return Object.keys(parsed)
      .map(key => `${key}: <b>${parsed[key]}</b>`)
      .join('<br/>');
  } catch (e) {
    return ''
  }
}

export const initialSpan = (span: string | undefined, defaultRange: number): [number, number] => {
  if (span) {
    const [start, end] = span.split('-');

    return [parseInt(start, 10), parseInt(end, 10)];
  }

  const now = new Date().getTime();

  return [now - defaultRange, now];
}

export const fetchData = (start: number, end: number) => {
  const controller = new AbortController();

  const contexts: Promise<Context[]> = fetch(`/api/contexts?start=${start}&end=${end}`, { signal: controller.signal })
    .then(response => response.json());

  const timings: Promise<ContextTiming[]> = fetch(`/api/context-timings?start=${start}&end=${end}`, { signal: controller.signal })
    .then(response => response.json());

  const executions: Promise<Execution[]> = fetch(`/api/executions?start=${start}&end=${end}`, { signal: controller.signal })
    .then(response => response.json());

  return {
    result: Promise.all([contexts, timings, executions]),
    abort: controller.abort.bind(controller)
  }
}

export const executionItems = (executions: Execution[]): DataItem[] =>
  executions
    .map((execution, index) => ({
      className: classNames('timeline-execution', {
        'timeline-execution-resolved': execution.resolved_at !== null,
        'timeline-execution-rejected': execution.rejected_at !== null,
        'timeline-execution-cancelled': execution.cancelled_at !== null,
        'timeline-execution-unfinished': execution.end === null
      }),
      id: execution.id,
      order: index,
      content: `${execution.task_name}`,
      type: 'range',
      start: execution.start !== null ? execution.start : 0,
      end: execution.end !== null ? execution.end : new Date().getTime(),
      group: execution.context_id || '__no_context'
    }));

export const timingItems = (timings: ContextTiming[]): DataItem[] =>
  timings.map(timing => ({
    type: 'background',
    start: timing.start,
    end: timing.end,
    className: `timeline-context-timing-${timing.type}`,
    group: timing.context_id,
    content: ''
  }));

export const boundaryItems = (start: number, end: number): DataItem[] => ([{
  type: 'background',
  start: 0,
  end: start,
  className: 'timeline-out-of-bounds',
  content: ''
}, {
  type: 'background',
  start: end,
  end: Number.MAX_SAFE_INTEGER,
  className: 'timeline-out-of-bounds',
  content: ''
}]);

export const contextGroups = (contexts: Context[]): DataGroup[] => ([
  ...contexts.map(context => {
    const children = contexts
      .filter(({ parent_id }: any) => parent_id === context.id);

    return {
      id: context.id,
      content: prettifyLabels(context.labels),
      treeLevel: 1,
      nestedGroups: children.length ? children.map(({ id }) => id) : undefined,
      className: 'timeline-context'
    };
  }), {
    id: '__no_context',
    content: 'No Context',
    className: 'timeline-context timeline-context-empty'
  }
])
