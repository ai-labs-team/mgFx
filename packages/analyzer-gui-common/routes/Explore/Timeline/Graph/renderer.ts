/**
 * Functions for creating a `Layout` structure from a list of Spans.
 *
 * Since these functions potentially operate over a very large number of Spans, performance and efficiency is
 * paramount. For this reason, these functions are implemented in the classical, imperative style and typically rely on tuples for storing structured data.
 *
 *  Of course, this instead shifts the burden from the CPU to the programmer's ability and comprehension. To help this,
 *  I've tried to document these functions as best as possible.
 */
import { Span } from '@mgfx/analyzer';

/**
 * Creates a `Layout` structure from a flat array of Spans.
 *
 * **IMPORTANT**: This Function assumes that the list of Spans has already been ordered by time. Consider using the
 * `compareByTime` function as a comparator.
 *
 * This is the most expensive function to run, so it is
 * strongly advised that invocations of this function are controlled:
 *
 * - Only run when the list of Spans (or element(s) therein) have actually changed (ie, not in response to user
 * activities such as changing the visible area on the Timeline.)
 *
 * - Limit the number of invocations per second in order to prevent thrashing, and/or frequently discarding Layout
 * results that we spent so many cycles obtaining.
 *
 * - Since this is logic is CPU-bound and un-yielding, it is wise to consider using a Web Worker, so that the layout
 * can be computed outside of the main thread.
 */
export const render = (spans: Span[]): Layout => {
  /**
   * Renders a 'sub-layout' for a given Span, with all of it's child Spans (and their children, etc.) also laid out
   * directly below it.
   */
  const recursivelyRenderSpan = (span: Span): Layout => {
    // Initialize the result as a Layout only containing Span being referenced
    const result: Layout = [
      span.createdAt,
      (span as MaybeEndedSpan).endedAt,
      [
        [
          [
            span.id,
            span.parentId,
            span.process.spec.name,
            span.state,
            span.createdAt,
            (span as MaybeEndedSpan).endedAt,
          ],
        ],
      ],
    ];

    // Initialize another Layout that only consists of the Children of this Span, and their children.
    const childLayout = renderChildrenRecursively(span);

    // If there were children and we got a Layout containing them, merge them *below* the result
    if (childLayout) {
      mergeBelow(result, childLayout);
    }

    return result;
  };

  /**
   * Renders a 'sub-layout' containing all children (and their children, etc) of a given Span.
   */
  const renderChildrenRecursively = (parent: Span): Layout | undefined => {
    // If we never encounter a Child, then we'll never have a layout to return
    let result: Layout | undefined;

    // Iterate over each Span in the list given to the outer function, searching for children
    for (let i = 0; i < spans.length; i += 1) {
      const child = spans[i];
      if (child.parentId !== parent.id) {
        // This Span is not a child of the given parent, so continue to the next one
        continue;
      }

      // Recursively render this child
      const layout = recursivelyRenderSpan(child);

      if (!result) {
        // This is first child layout we found; set result and continue to the next Span
        result = layout;
        continue;
      }

      // We've already found a prior child layout, so merge it (either across or below) into the existing result.
      merge(result, layout);
    }

    return result;
  };

  // Keep track of the distinct Layouts for each 'root' Span in the list
  const rootLayouts: Layout[] = [];

  // Outer-most iteration over root or orphan Spans
  for (let ir = 0; ir < spans.length; ir += 1) {
    const root = spans[ir];

    // Span references a parent; determine if orphan
    if (root.parentId) {
      let hasParent = false;

      // Second-level iteration to determine if referenced parent is also present
      for (let j = 0; j < spans.length; j += 1) {
        const other = spans[j];

        // We found this Span's parent; bail out of inner loop
        if (other.id === root.parentId) {
          hasParent = true;
          break;
        }
      }

      // We found a Parent for this Span, so it's not a root or orphan - continue to the next Span
      if (hasParent) {
        continue;
      }
    }

    // Render a sub-layout for this Root and add it to the list of results
    rootLayouts.push(recursivelyRenderSpan(root));
  }

  // Finally, merge all of the distinct root layouts
  return mergeAll(rootLayouts);
};

/**
 * Modifies the `destination` Layout such that it's rows contain the rows from `source`:
 *
 * - When the bounds of `destination` and `source` overlap, then the rows from `source` will be placed *below* the
 * existing rows in `destination`.
 *
 * - When the bounds of `destination` and `source` *do not* overlap, then each row in `source` will be merged with each
 * row in `destination`.
 *
 * Overlapping Layouts Example:
 * ```
 *dst: ..---....
 *     ..--.....
 *
 *src: ....----.
 *           --.
 *
 *r:   ..---....
 *     ..--.....
 *     ....----.
 *           --.
 * ```

 * Non-overlapping Layouts Example:
 * ```
 *dst: ..---....
 *     ..-- ....
 *
 *src: ......--.
 *     .......-.
 *
 *r:   ..---.--.
 *     ..-- ..-.
 * ```
 */
export const merge = (destination: Layout, source: Layout) => {
  const overlaps = doesOverlap(destination, source);
  overlaps ? mergeBelow(destination, source) : mergeAcross(destination, source);
};

/**
 * Compares the lower- and upper-bounds of two Layouts to determine if they overlap
 */
export const doesOverlap = (
  a: [number, number | undefined, ...any[]],
  b: [number, number | undefined, ...any[]]
): boolean =>
  (b[1] === undefined ? true : a[0] < b[1]) &&
  (a[1] === undefined ? true : a[1] > b[0]);

/**
 * Merges the rows from `source` into `destination` row-by-row by appending `source` Cells to the right of
 * `destination` Cells, and extends the lower- and upper- bounds of `destination` to account for `source` bounds.
 *
 * It is assumed that `source` and `destination` *do not* overlap; use `doesOverlap` to test for this.
 *
 * Optionally, `offset` may specify to row in `destination` to be begin merging in rows from `source`.
 */
export const mergeAcross = (
  destination: Layout,
  source: Layout,
  offset = 0
) => {
  extendBounds(destination, source);
  const destRows = destination[2];
  const srcRows = source[2];

  for (let i = 0; i < srcRows.length; i += 1) {
    destRows[offset + i] = destRows[offset + i]
      ? [...destRows[offset + i], ...srcRows[i]]
      : srcRows[i];
  }
};

/**
 * Merges the rows from `source` into `destination` by appending source rows directly below destination rows, and
 * extending the lower- and upper- bound of `destination` to account for `source`.
 *
 * This is only required if `source` and `destination` overlap; use `doesOverlap` to test for this.
 */
export const mergeBelow = (destination: Layout, source: Layout) => {
  extendBounds(destination, source);

  destination[2] = [...destination[2], ...source[2]];
};

/**
 * Merges an arbitrary number of sub-layouts into one by computing 'placement' for each; the row on which each Layout
 * may be placed without causing it overlap with previously placed Layouts.
 */
export const mergeAll = (layouts: Layout[]) => {
  // Initialize our result as an empty layout
  const result: Layout = [0, 0, []];

  // Remember the row that each Layout should be placed at
  const layoutRows: number[] = [];

  // Iterate over each Layout given
  for (let i = 0; i < layouts.length; i += 1) {
    const [start, end, rows] = layouts[i];

    // Tracks the row we are currently attempting to place this Layout onto
    let attemptedRow = 0;
    const height = rows.length;

    const candidates: [number, number][] = [];

    // Iterate over each already-placed Layout that overlaps (by time) with this one, and store the row and height of
    // each
    for (let j = 0; j < layoutRows.length; j += 1) {
      const [otherStart, otherEnd, otherRows] = layouts[j];

      // Determine if this Layout overlaps (by time) the other, already-placed Layout
      const overlapsByTime = doesOverlap([start, end], [otherStart, otherEnd]);
      if (!overlapsByTime) {
        // This Layout doesn't overlap by time, so is of no use to us
        continue;
      }

      const otherRow = layoutRows[j];
      const otherHeight = otherRows.length;

      // We found a match; store it's placement row and height in the list of candidates
      candidates.push([otherRow, otherHeight]);
    }

    // Now begin working our way downward until we find a Row we can place this Layout at
    let j = 0;
    while (j < candidates.length) {
      const [otherRow, otherHeight] = candidates[j];

      const overlapsByRow = doesOverlap(
        [attemptedRow, attemptedRow + height],
        [otherRow, otherRow + otherHeight]
      );

      if (!overlapsByRow) {
        // We clear this candidate, but keep searching for more below...
        j += 1;
        continue;
      }

      // We collided with this candidate; move below it and start again
      attemptedRow = otherRow + otherHeight;
      j = 0;
    }

    layoutRows[i] = attemptedRow;
  }

  // Now we know how to place these Layouts without collisions, begin merging them into the required rows
  for (let i = 0; i < layoutRows.length; i += 1) {
    const row = layoutRows[i];
    mergeAcross(result, layouts[i], row);
  }

  return result;
};

/**
 * Modifies the lower- and upper-bounds of `destination` such that it fully encloses the bounds of `source`.
 */
export const extendBounds = (destination: Layout, source: Layout) => {
  // Extend the lower bound if source < destination
  const extendLower = source[0] < destination[0];
  if (extendLower) {
    destination[0] = source[0];
  }

  const extendUpper =
    // Ensure dest. is un-ended if source is un-ended
    source[1] === undefined ||
    // If dest. is ended and source is greater
    (destination[1] !== undefined && source[1] > destination[1]);

  if (extendUpper) {
    destination[1] = source[1];
  }
};

/**
 * Optimizes a Layout to reduce it's size and complexity:
 *
 * - Returns a subset of rows according to `rows` start and end specifier
 * - Returns a subset of cells for each row according to `time` start and end specifier
 * - Optionally 'coalesces' multiple Cells into a single Cell when their total time and time between the predecessor on
 *   the same row falls below the `coalesceThreshold`.
 */
export const optimize = (
  layout: Layout,
  rows: [number, number],
  time: [number, number],
  coaescleThreshold = 0
) => {
  const result: OptimizedLayout = [];

  // Iterate each layout row between the given start and end, clamped to the actual number of rows
  const limit = Math.min(rows[1], layout[2].length);
  for (let i = rows[0]; i < limit; i += 1) {
    const row = layout[2][i];
    let cells: OptimizedCell[];

    // Iterate each Cell in this row
    for (let j = 0; j < row.length; j += 1) {
      const cell = layout[2][i][j];

      const visible = doesOverlap([cell[4], cell[5]], time);

      // This Cell doesn't fall within the time requested; omit it
      if (!visible) {
        continue;
      }

      // This is the first Cell on this Row to include; initialize the result row and continue to next cell
      if (!cells) {
        cells = [[cell, 0]];
        continue;
      }

      // Attempt to coalesce this Cell into the previous one on this row, if requested/possible
      if (coaescleThreshold > 0) {
        const prevCell = cells[cells.length - 1];
        const canCoalesce =
          prevCell && canCoalesceWith(prevCell, cell, coaescleThreshold);

        if (canCoalesce) {
          // Coalesce this cell with the previous one on this row and omit it
          coalesceWith(prevCell, cell);
          continue;
        }
      }

      // This cell falls within the requested time frame and has not been coalesced, so add it to the already-existing
      // row
      cells.push([cell, 0]);
    }

    // This row contains at least one cell, so add it to the result, remembering the original row number
    if (cells) {
      result.push([i, cells]);
    }
  }

  return result;
};

/**
 * Determines if the `source` cell may be 'coalesced' into the preceeding `destination` cell
 */
export const canCoalesceWith = (
  destination: OptimizedCell,
  source: Cell,
  threshold: number
) =>
  // Destination state is same as source state
  destination[0][3] === source[3] &&
  // Destination duration <= threshold
  destination[0][5] - destination[0][4] <= threshold &&
  // Source duration <= threshold
  source[5] - source[4] <= threshold &&
  // Time between destination ending (not including any other coalesced cells) and source's beginning <= threshold
  source[4] - destination[0][5] <= threshold;

/**
 * Modifies `destination` such that it is aware that `source` has been coalesced into it
 */
export const coalesceWith = (destination: OptimizedCell, source: Cell) => {
  // Increment the number of cells that have been coalesced into `destination`
  destination[1] += 1;

  // Set the end-time of all coalesced cells to be `source`'s end time
  destination[2] = source[5];
};

/**
 * Comparison function for two Span objects.
 */
export const compareByTime = (a: MaybeEndedSpan, b: MaybeEndedSpan) => {
  // A and B started at different times; first-to-start goes first
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }

  // A and B started at the same time, so order based on end time...

  // Neither A nor B have ended; preseve current order
  if (a.endedAt === undefined && b.endedAt === undefined) {
    return 0;
  }

  // B has ended but A has not; A goes first
  if (b.endedAt !== undefined && a.endedAt === undefined) {
    return 1;
  }

  // A has ended but B has not; B goes first
  if (a.endedAt !== undefined && b.endedAt === undefined) {
    return -1;
  }

  // A and B have both ended; first-to-end goes first
  return a.endedAt - b.endedAt;
};

/**
 * A bit of hacky type alias so that we can use `span.endedAt` when it may be undefined, rather than
 * `'endedAt' in Span ? span.endedAt : undefined`.
 */
type MaybeEndedSpan = Span & { endedAt: number | undefined };

/**
 * A tuple that represents a hierarchical timeline of Spans
 */
export type Layout = [
  // 0 - The 'lower' bound (ie, the earliest starting time of a Span represented in this Layout)
  number,
  // 1 - The 'upper' bound (ie, the latest ending time of a Span represented in this Layout)
  //     `undefined` if this Layout contains an un-ended Span
  number | undefined,
  // 2 - An array of Rows contained within this Layout
  Row[]
];

/**
 * A Row is really just an array of Cells
 */
export type Row = Cell[];

/**
 * A tuple that represents a single display element within a Layout
 */
export type Cell = [
  // 0 - The ID of the Span this Cell represents
  string,
  // 1 - The Parent ID of the Span this Cell represents, or `undefined` when none
  string | undefined,
  // 2 - The human-readable name of the mgFx Task definition.
  string,
  // 3 - The current execution state of this Span
  Span['state'],
  // 4 - The start time of this Span
  number,
  // 5 - The end time of this Span, or `undefined` if still running
  number | undefined
];

/**
 * The result of passing a Layout through the `optimize` function. Really it's just an array of `OptimizedRow`s.
 */
export type OptimizedLayout = OptimizedRow[];

/**
 * A tuple that represents each row of a Layout after passing through `optimize`
 */
export type OptimizedRow = [
  // 0 - The row number in the original Layout - allows us to present a stable view when some rows have been omitted
  // entirely due to optimization.
  number,
  // 1 - An array of optimized cells within this Row
  OptimizedCell[]
];

/**
 * A tuple that represents a Cell after being passed through `optimize`.
 */
export type OptimizedCell =
  | [
      // 0 - The original Cell
      Cell,
      // 1 - The number of following Cells that have been coalesced into this one; 0 by default
      0
    ]
  | [
      // 0 - The original Cell
      Cell,
      // 1 - The number of following Cells that have been coalesced into this one
      number,
      // 2 - The end time of the last Cell that has been coalesced into this one
      number
    ];
