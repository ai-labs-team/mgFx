import { Span, SpanParameters } from '@mgfx/analyzer/dist/query';
import { value } from '@mgfx/codecs';
import knex from 'knex';
import { go, map, parallel } from 'fluture';

const qb = knex({ client: 'sqlite', useNullAsDefault: true });
const all = parallel(Infinity);

export const buildQuery = (params: SpanParameters) =>
  go(function*() {
    let query = qb.select('*').from('spans');

    if (params.scope?.spec?.name) {
      query.where('process_spec_name', params.scope.spec.name);
    }

    if (params.scope?.input) {
      const _value = yield value.encode(params.scope.input.eq);
      query.where('input', _value);
    }

    if (params.scope?.state) {
      query.where('state', params.scope.state);
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
      query = buildRecursiveQuery(query, params.scope.id);
    }

    return query;
  });

export const formatResult = (rows: any[]) => all(rows.map(formatRow));

const buildRecursiveQuery = (query: knex.QueryBuilder, rootId: string) =>
  qb
    .select('*')
    .from('recursive_spans')
    .withRecursive(
      'recursive_spans',
      query
        .clone()
        .where('id', rootId)
        .unionAll(subq => {
          subq
            .select('spans.*')
            .from(qb.raw('spans, recursive_spans'))
            .where(qb.raw('recursive_spans.id = spans.parent_id'));
        })
    );

const formatRow = (row: any) => {
  const decodes = [value.decode(row.input), value.decode(row.context_values)];

  if (row.state === 'resolved') {
    decodes.push(value.decode(row.value));
  }

  if (row.state === 'rejected') {
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
          state: row.state
        };

        if (row.state === 'running') {
          return span;
        }

        if (row.state === 'resolved') {
          return {
            ...span,
            resolvedAt: row.resolved_at,
            value: valueOrReason
          };
        }

        if (row.state === 'rejected') {
          return {
            ...span,
            rejectedAt: row.rejected_at,
            reason: valueOrReason
          };
        }

        if (row.state === 'cancelled') {
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
