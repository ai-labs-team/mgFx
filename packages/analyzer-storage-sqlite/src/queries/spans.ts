import { Span, SpanParameters } from '@mgfx/analyzer/dist/query';
import { value } from '@mgfx/codecs';
import knex from 'knex';
import { go, map, parallel } from 'fluture';

const qb = knex({ client: 'sqlite', useNullAsDefault: true });
const all = parallel(Infinity);

const STATE_VALUES = ['running', 'resolved', 'rejected', 'cancelled'] as const;

export const buildQuery = (params: SpanParameters) =>
  go(function*() {
    let query = qb.from('spans');
    applySelects(query, params);
    applyJoins(query, params);

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
        params.order.field === 'createdAt'
          ? 'created_at'
          : params.order.field === 'resolvedAt'
          ? 'resolved_at'
          : params.order.field === 'rejectedAt'
          ? 'rejected_at'
          : 'cancelled_at';

      query.orderBy(field, params.order.direction);
    }

    if (params.scope?.id) {
      query = buildRecursiveQuery(query, params) as any;
    }

    return query;
  });

export const formatResult = (rows: any[]) => all(rows.map(formatRow));

const applySelects = (query: knex.QueryBuilder, params: SpanParameters) => {
  query.select(
    'spans.id',
    'spans.parent_id',
    'spans.created_at',
    'spans.process_spec_name',
    'vc_input.content AS input',
    'spans.context_id',
    'spans.context_parent_id',
    'vc_context.content AS context_values',
    'spans.state',
    'spans.resolved_at',
    'vc_reason.content AS reason',
    'spans.cancelled_at',
    'vc_value.content AS value'
  );
};

const applyJoins = (query: knex.QueryBuilder, params: SpanParameters) => {
  query
    .leftJoin(
      'value_cache AS vc_input',
      'spans.input_id',
      '=',
      'vc_input.rowid'
    )
    .leftJoin(
      'value_cache AS vc_context',
      'spans.context_values_id',
      '=',
      'vc_context.rowid'
    )
    .leftJoin(
      'value_cache AS vc_value',
      'spans.value_id',
      '=',
      'vc_value.rowid'
    )
    .leftJoin(
      'value_cache AS vc_reason',
      'spans.reason_id',
      '=',
      'vc_reason.rowid'
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

const formatRow = (row: any) => {
  const decodes = [value.decode(row.input), value.decode(row.context_values)];

  if (row.state === 1) {
    // resolved
    decodes.push(value.decode(row.value));
  }

  if (row.state === 2) {
    // rejected
    decodes.push(value.decode(row.reason));
  }

  return all(decodes).pipe(
    map(
      ([input, contextValues, valueOrReason]): Span => {
        const span = {
          id: row.id,
          parentId: row.parent_id || undefined,
          createdAt: row.created_at,
          process: {
            spec: {
              name: row.process_spec_name
            }
          },
          input,
          context: row.context_id
            ? {
                id: row.context_id,
                parentId: row.context_parent_id,
                values: contextValues
              }
            : undefined,
          state: STATE_VALUES[row.state] as any
        };

        if (row.state === 0) {
          // running
          return span;
        }

        if (row.state === 1) {
          // resolved
          return {
            ...span,
            resolvedAt: row.resolved_at,
            value: valueOrReason
          };
        }

        if (row.state === 2) {
          // rejected
          return {
            ...span,
            rejectedAt: row.rejected_at,
            reason: valueOrReason
          };
        }

        if (row.state === 3) {
          // cancelled
          return {
            ...span,
            cancelledAt: row.cancelled_at
          };
        }

        throw new Error(`Unable to format Span with Process ID ${row.id}`);
      }
    )
  );
};
