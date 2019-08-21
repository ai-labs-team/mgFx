export const insertMessage = `
INSERT INTO messages_v1 VALUES (
  $hostname,
  $pid,
  $time,
  $msg,
  JSON($data)
);
`;

export const upsertExecutionEnqueued = `
INSERT INTO executions_v1(
  id,
  context_id,
  parent_id,
  task_name,
  args,
  enqueued_at,
  start
) VALUES (
  $id,
  $contextId,
  $parentId,
  $taskName,
  $args,
  $time,
  $time
)
ON CONFLICT(id) DO
UPDATE SET
  context_id=$contextId,
  parent_id=$parentId,
  task_name=$taskName,
  args=JSON($args),
  enqueued_at=$time,
  start=$time
WHERE
  id=$id
`

export const upsertExecutionExecuting = `
INSERT INTO executions_v1(
  id,
  executing_at,
  executor_id
) VALUES (
  $id,
  $time,
  $executorId
)
ON CONFLICT(id) DO
UPDATE SET
  executing_at=$time,
  executor_id=$executorId
WHERE
  id=$id
`;

export const upsertExecutionResolved = `
INSERT INTO executions_v1(
  id,
  resolved_at,
  resolved_value,
  end
) VALUES (
  $id,
  $time,
  JSON($value),
  $time
)
ON CONFLICT(id) DO
UPDATE SET
  resolved_at=$time,
  resolved_value=JSON($value),
  end=$time
WHERE
  id=$id
`;

export const upsertExecutionRejected = `
INSERT INTO executions_v1(
  id,
  rejected_at,
  rejected_reason,
  end
) VALUES (
  $id,
  $time,
  JSON($reason),
  $time
)
ON CONFLICT(id) DO
UPDATE SET
  rejected_at=$time,
  rejected_reason=JSON($reason),
  end=$time
WHERE
  id=$id
`;

export const upsertExecutionCancelled = `
INSERT INTO executions_v1(
  id,
  cancelled_at,
  end
) VALUES (
  $id,
  $time,
  $time
)
ON CONFLICT(id) DO
UPDATE SET
  cancelled_at=$time,
  end=$time
WHERE
  id=$id
`;

export const insertCreateContext = `
INSERT INTO contexts_v1 VALUES (
  $id,
  $parentId,
  JSON($labels),
  $time
)
`;
