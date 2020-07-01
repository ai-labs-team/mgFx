import pgPromise, { queryResult } from 'pg-promise';
import { SpanParameters } from '@mgfx/analyzer/dist/query';
import knex from 'knex';

const qb = knex({ client: 'pg' });
const pgp = pgPromise();

export const buildQuery = (params: SpanParameters) => {
  let query = qb.from('spans');
  applySelects(query, params);
  applyDistinct(query, params);
  applyWhereInput(query, params);

  query.whereNotNull('createdAt');

  if (params.scope?.context?.id) {
    query.whereRaw(`context ->> 'id' = ?`, params.scope.context.id);
  }

  if (params.scope?.spec?.name) {
    query.whereRaw(`process #>> '{spec,name}' = ?`, params.scope.spec.name);
  }

  if (params.scope?.state) {
    query.where('state', params.scope.state);
  }

  if (params.scope?.id) {
    query = buildRecursiveQuery(query, params) as any;
  }

  if (params.limit) {
    query.limit(params.limit);
  }

  if (params.offset) {
    query.offset(params.offset);
  }

  if (params.order) {
    query.orderBy(params.order.field, params.order.direction);
  }

  return query;
};

const applySelects = (query: knex.QueryBuilder, params: SpanParameters) => {
  query.select(
    'spans.id',
    'spans.parentId',
    'spans.createdAt',
    'spans.process',
    params.compact ? qb.raw(`spans.context - 'values' AS context`) : 'spans.context',
    'spans.state',
    'spans.endedAt'
  );

  if (params.compact !== true) {
    query.select(
      'spans.input',
      qb.raw('spans.input IS NULL AS input_undefined'),
      'spans.output',
      qb.raw('spans.output IS NULL as output_undefined'),
    );
  }
};

const applyWhereInput = (query: knex.QueryBuilder, params: SpanParameters) => {
  if (!params.scope?.input) {
    return;
  }

  if (params.scope.input.path) {
    query.whereRaw('input #> ? = ?', params.scope.input.path, params.scope.input.eq);
    return;
  }

  if (params.scope.input.eq === undefined) {
    query.whereNull('input');
    return;
  }

  query.whereRaw('input = ?:json', [params.scope.input.eq]);
}

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
        .where('spans.id', params.scope!.id!)
        .unionAll(subq => {
          subq
            .from(qb.raw('spans, recursive_spans'))
            .where(qb.raw('recursive_spans.id = spans."parentId"'));

          applySelects(subq, params);
        })
    );

const applyDistinct = (query: knex.QueryBuilder, params: SpanParameters) => {
  if (!params.distinct) {
    return;
  }

  if (params.distinct === 'input') {
    query.distinctOn('input');
    query.orderBy('input');
  } else if (params.distinct === 'output') {
    query.distinctOn('output');
    query.orderBy('output');
  } else if ('input' in params.distinct) {
    const pathExpr = qb.raw('input #> ?', [params.distinct.input.path]);
    query.distinctOn(pathExpr as any);
    query.orderByRaw(pathExpr)
  } else if ('output' in params.distinct) {
    const pathExpr = qb.raw('output #> ?', [params.distinct.output.path]);
    query.distinctOn(pathExpr as any);
    query.orderByRaw(pathExpr)
  }
};

export const formatRows = (params: SpanParameters) => (rows: any[]) =>
  params.compact
    ? rows
    : rows.map((row) => ({
        ...row,
        input: row.input_undefined ? undefined : row.input,
        output: row.output_undefined ? undefined : row.output,
      }));