/**
 * Defines the available query parameter and result types. Currently, only querying of 'spans' is supported, but it
 * would be nice to support other data, such as Contexts.
 */
import { Observable } from 'kefir';
import { FutureInstance } from 'fluture';
import { Values } from 'mgfx/dist/context';

/**
 * The parameters which may be specified when querying for a list of Spans.
 */
export type SpanParameters = Partial<{
  /**
   * `scope` dictates the criteria by which Spans should be retrieved. Each of the scope options are combined using an
   * `AND` operator; `OR` and other more complex operators have not yet been implemented.
   *
   * **NOTE**: Since both `scope` and `limit` are optional, it's entirely possible to make a Query that returns *all*
   * Spans; this may result in severe performance issues down the road and will likely need to be reworked to prevent
   * such scenarios.
   */
  scope: Partial<{
    /**
     * If specified, only the Span with this Process ID _and it's direct or indirect descendants_ will be selected.
     */
    id: string;
    /**
     * If specified, only Spans matching the Process' Task Definition name will be selected.
     */
    spec: {
      name: string;
    };
    /**
     * Select Spans according to equality on process' input. If `path` is specified, then only that path within array-
     * or object-based Inputs will be matched.
     */
    input: {
      eq: any;
      path?: string[];
    };
    /**
     * Select Spans whose Process is currently in a specific state.
     */
    state: 'running' | 'resolved' | 'rejected' | 'cancelled';
  }>;
  /**
   * If specified, limits the number of Spans returned.
   */
  limit: number;
  /**
   * If specified, skips over this number of matching Spans.
   */
  offset: number;
  /**
   * If specified, allows sorting the result set by a Span's Timestamp.
   */
  order: {
    field: 'createdAt' | 'resolvedAt' | 'rejectedAt' | 'cancelledAt';
    direction: 'asc' | 'desc';
  };
}>;

/**
 * A Span represents a 'snapshot' of a Process' current state, reconstructed from Instrumentation data.
 */
export type Span = {
  id: string;
  parentId?: string;
  createdAt: number;
  process: {
    spec: {
      name: string;
    };
  };
  input: any;
  context?: {
    id: string;
    parentId: string;
    values: Values;
  };
} & (
  | { state: 'running' }
  | { state: 'resolved'; resolvedAt: number; value: any }
  | { state: 'rejected'; rejectedAt: number; reason: any }
  | { state: 'cancelled'; cancelledAt: number }
);

/**
 * The uniform interface for querying analysis data such as Spans. After supplying parameters in the function call, the following functions are available:
 *
 * - `get` - performs a query once and returns the data immediately.
 * - `watch` - returns a Kefir Observable which will emit the initial query result, and then again every time the query result changes.
 */
export type Interface<Params, Result> = (
  params: Params
) => {
  get: () => FutureInstance<any, Result>;
  watch: () => Observable<Result, any>;
};
