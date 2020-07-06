import { Span, SpanParameters } from '@mgfx/analyzer/dist/query';
import { value } from '@mgfx/codecs';
import knex from 'knex';
import { go, map, parallel } from 'fluture';

const qb = knex({ client: 'sqlite', useNullAsDefault: true });
const all = parallel(Infinity);

const STATE_VALUES = ['running', 'resolved', 'rejected', 'cancelled', 'dead'] as const;

export const buildQuery = (params: SpanParameters) =>
  go(function*() {
    let query = qb.from('spans');
    applySelects(query, params);
    applyJoins(query, params);
    applyGroup(query, params);

    if (params.scope?.context?.id) {
      query.where('context_id', params.scope.context.id);
    }

    if (params.scope?.spec?.name) {
      query.where('process_spec_name', params.scope.spec.name);
    }

    if (params.scope?.input) {
      const _value = yield value.encode(params.scope.input.eq);
      query.where('vc_input.content', _value);
    }

    if (params.scope?.state) {
      query.where('state', STATE_VALUES.indexOf(params.scope.state));
    }

    if (params.limit) {
      query.limit(params.limit);
    }

    if (params.offset) {
      query.offset(params.offset);
    }

    if (params.order) {
      const field =
        params.order.field === 'createdAt' ? 'created_at' : 'ended_at';

      query.orderBy(field, params.order.direction);
    }

    if (params.scope?.id) {
      query = buildRecursiveQuery(query, params) as any;
    }

    return query;
  });

export const formatResult = (params: SpanParameters) => (rows: any[]) =>
  all(rows.map(formatRow(params)));

const applySelects = (query: knex.QueryBuilder, params: SpanParameters) => {
  query.select(
    'spans.id',
    'spans.parent_id',
    'spans.created_at',
    'spans.process_spec_name',
    'spans.context_id',
    'spans.context_parent_id',
    'spans.state',
    'spans.ended_at',
    'spans.last_heartbeat',
  );

  if (params.compact !== true) {
    query.select(
      'vc_input.content AS input',
      'vc_context.content AS context_values',
      'vc_output.content AS output'
    );
  }
};

const applyJoins = (query: knex.QueryBuilder, params: SpanParameters) => {
  const shouldJoinInput =
    params.scope?.input ||
    params.compact !== true ||
    (params.distinct &&
      typeof params.distinct === 'object' &&
      'input' in params.distinct);

  if (shouldJoinInput) {
    query.leftJoin(
      'value_cache AS vc_input',
      'spans.input_id',
      '=',
      'vc_input.rowid'
    );
  }

  const shouldJoinRest =
    params.compact !== true ||
    (params.distinct &&
      typeof params.distinct === 'object' &&
      'output' in params.distinct);

  if (!shouldJoinRest) {
    return;
  }

  query
    .leftJoin(
      'value_cache AS vc_context',
      'spans.context_values_id',
      '=',
      'vc_context.rowid'
    )
    .leftJoin(
      'value_cache AS vc_output',
      'spans.output_id',
      '=',
      'vc_output.rowid'
    );
};

const buildRecursiveQuery = (
  query: knex.QueryBuilder,
  params: SpanParameters
) =>
  qb
    .select('*')
    .from('recursive_spans')
    .withRecursive(
      'recursive_spans',
      query
        .clone()
        .where('id', params.scope!.id)
        .unionAll(subq => {
          subq
            .from(qb.raw('spans, recursive_spans'))
            .where(qb.raw('recursive_spans.id = spans.parent_id'));

          applySelects(subq, params);
          applyJoins(subq, params);
        })
    );

const formatRow = (params: SpanParameters) => (row: any) => {
  const decodes = [];

  if (!params.compact) {
    decodes.push(value.decode(row.input), value.decode(row.context_values));

    if (row.state === 1 || row.state === 2) {
      // resolved or rejected
      decodes.push(value.decode(row.output));
    }
  }

  return all(decodes).pipe(
    map(
      ([input, contextValues, output]): Span => {
        const span = {
          id: row.id,
          parentId: row.parent_id || undefined,
          createdAt: row.created_at,
          process: {
            spec: {
              name: row.process_spec_name
            }
          },
          context: row.context_id
            ? {
                id: row.context_id,
                parentId: row.context_parent_id
              }
            : undefined,
          state: STATE_VALUES[row.state] as any
        };

        if (!params.compact) {
          Object.assign(span, { input });

          if (row.context_id) {
            Object.assign(span.context, { values: contextValues });
          }
        }

        if (row.state !== 0) {
          // not running
          Object.assign(span, { endedAt: row.ended_at });
        }

        if (!params.compact && (row.state === 1 || row.state === 2)) {
          // resolved or rejected
          Object.assign(span, { output });
        }

        if (params.heartbeat && row.state === 0) {
          const livenessThreshold =
            (row.last_heartbeat || row.created_at) +
            params.heartbeat.livenessThreshold;

          if (livenessThreshold < Date.now()) {
            // dead
            Object.assign(span, {
              state: 'dead',
              heartbeat: { last: row.last_heartbeat },
              endedAt: livenessThreshold
            });
          }
        }

        return span;
      }
    )
  );
};

const applyGroup = (query: knex.QueryBuilder, params: SpanParameters) => {
  if (!params.distinct) {
    return;
  }

  query.havingRaw('max(created_at)');

  if (params.distinct === 'input') {
    return query.groupBy('input_id');
  }

  if (params.distinct === 'output') {
    return query.groupBy('output_id');
  }

  if ('input' in params.distinct) {
    return query.groupByRaw(
      'json_extract(vc_input.content, ?)',
      params.distinct.input.path
    );
  }

  if ('output' in params.distinct) {
    return query.groupByRaw(
      'json_extract(vc_output.content, ?)',
      params.distinct.output.path
    );
  }
};
