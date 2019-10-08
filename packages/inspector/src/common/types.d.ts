export type Execution = {
  id: string;
  context_id: string | null;
  parent_id: string | null;
  task_name: string;
  args: string;
  enqueued_at: number;

  executing_at: number | null;
  executor_id: string | null;

  resolved_at: number | null;
  resolved_value: string | null;

  rejected_at: number | null;
  rejected_reason: string | null;

  cancelled_at: number | null;

  start: number | null;
  end: number | null;
}

export type Context = {
  id: string;
  created_at: number;
  parent_id: string | null;
  labels: string;
}

export type ContextTiming = {
  context_id: string;
  type: 'self' | 'others';
  start: number;
  end: number;
}
