const _ctes = {
  activeExecutions: `
active_executions AS (
  SELECT
    id,
    context_id,
    start,
    end
  FROM executions_v1
  WHERE (
    executions_v1.start BETWEEN $start AND $end
  ) OR (
    executions_v1.end BETWEEN $start AND $end
  ) OR (
    executions_v1.start <= $start AND
    executions_v1.end >= $end
  )
)`,

  activeContexts: `
active_contexts AS (
  SELECT DISTINCT contexts_v1.*
  FROM contexts_v1

  JOIN active_executions
  ON active_executions.context_id = contexts_v1.id
)`,

  ancestry: `
ancestry AS (
  SELECT
    parent_id AS id,
    id AS descendant
  FROM active_contexts

  UNION ALL

  SELECT
    id,
    NULL AS descendant
  FROM active_contexts

  UNION ALL

  SELECT
    contexts_v1.parent_id AS id,
    ancestry.descendant
  FROM ancestry
  JOIN contexts_v1
  ON (
    contexts_v1.id = ancestry.id
  ) AND (
    contexts_v1.parent_id IS NOT NULL
  )
)`,

  timing: {
    self: `
timing_self_1 AS (
  SELECT
    context_id,
    start AS ts,
    +1 AS type,
    1 AS sub
  FROM active_executions

  UNION ALL

  SELECT
    context_id,
    end AS ts,
    -1 AS type,
    0 AS sub
  FROM active_executions
),

timing_self_2 AS (
  SELECT
    timing_self_1.*,
    SUM(type) OVER(
      PARTITION BY context_id
      ORDER BY
        ts,
        type DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) - sub AS cnt

  FROM timing_self_1
),
timing_self AS (
  SELECT
    context_id,
    ts,
    CAST((ROW_NUMBER() OVER(
      PARTITION BY context_id
      ORDER BY ts
    ) - 1) / 2 + 1 AS int) AS grpnum
  FROM timing_self_2
  WHERE cnt = 0
)`,

    others: `
timing_others_1 AS (
  SELECT
    ancestry.id,
    start AS ts,
    +1 AS type,
    1 AS sub
  FROM ancestry
  JOIN active_executions
    ON active_executions.context_id = ancestry.descendant

  UNION ALL

  SELECT
    ancestry.id,
    end AS ts,
    -1 AS type,
    0 AS sub
  FROM ancestry
  JOIN active_executions
    ON active_executions.context_id = ancestry.descendant
),
timing_others_2 AS (
  SELECT timing_others_1.*,
  SUM(type) OVER(
    PARTITION BY id
    ORDER BY
      ts,
      type DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) - sub AS cnt
  FROM timing_others_1
),
timing_others AS (
  SELECT
    id,
    ts,
    CAST((ROW_NUMBER() OVER(
      PARTITION BY id
      ORDER BY ts
    ) - 1) / 2 + 1 AS int) AS grpnum
  FROM timing_others_2
  WHERE cnt = 0
)`
  }
}

export const contexts = `
WITH RECURSIVE
  ${_ctes.activeExecutions},
  ${_ctes.activeContexts},
  ${_ctes.ancestry}

SELECT DISTINCT contexts_v1.*
FROM contexts_v1
JOIN ancestry
  ON ancestry.id = contexts_v1.id
`;

export const contextTimings = `
WITH RECURSIVE
  ${_ctes.activeExecutions},
  ${_ctes.activeContexts},
  ${_ctes.ancestry},
  ${_ctes.timing.self},
  ${_ctes.timing.others}

SELECT
  context_id,
  'self' AS type,
  MIN(ts) AS start,
  max(ts) AS end
FROM timing_self
GROUP BY context_id, grpnum

UNION ALL

SELECT
  id,
  'others' AS type,
  MIN(ts) AS start,
  max(ts) AS end
FROM timing_others
GROUP BY id, grpnum
`

export const executions = `
WITH ${_ctes.activeExecutions}
SELECT executions_v1.*
FROM executions_v1
JOIN active_executions USING (id)
`;

export const executionsInContext = `
SELECT *
FROM executions_v1
WHERE start >= $start
  AND end <= $end
  AND context_id = $context
`;

export const execution = `SELECT * FROM executions_v1 WHERE id = $id`;
