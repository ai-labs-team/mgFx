import { Context, ContextTiming, Execution } from '@common/types';

export type ExecutionsOptions = {
  start: number;
  end: number;
  context?: string;
}

export type ContextsOptions = {
  start: number;
  end: number;
  parentId: string | null;
}

export type ContextTimingsOptions = {
  start: number;
  end: number;
}

export interface DbAdapter {
  contexts: (options: ContextsOptions) => Promise<Context[]>;
  contextTimings: (options: ContextTimingsOptions) => Promise<ContextTiming[]>;
  executions: (options: ExecutionsOptions) => Promise<Execution[]>;
  execution: (id: string) => Promise<Execution>;
}
