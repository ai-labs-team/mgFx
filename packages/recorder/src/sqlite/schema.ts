export const schema = `
CREATE TABLE IF NOT EXISTS messages_v1 (
  hostname TEXT,
  pid INTEGER,
  time INTEGER,
  msg TEXT,
  data TEXT
);

CREATE TABLE IF NOT EXISTS executions_v1 (
  id TEXT PRIMARY KEY,
  context_id TEXT,
  parent_id TEXT,
  task_name TEXT,
  args TEXT,
  enqueued_at INTEGER,
  executing_at INTEGER,
  executor_id TEXT,
  resolved_at INTEGER,
  resolved_value TEXT,
  rejected_at INTEGER,
  rejected_reason TEXT,
  cancelled_at INTEGER,
  start INTEGER,
  end INTEGER
);

CREATE TABLE IF NOT EXISTS contexts_v1 (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  labels TEXT,
  created_at INTEGER
);
`;
