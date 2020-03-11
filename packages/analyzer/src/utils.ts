import { Span } from './query';

export type Node = Span & {
  children: Node[];
};

/**
 * Transforms a flat list of Spans into a tree-like data structure.
 */
export const toTree = (spans: Span[], id: string): Node | undefined => {
  const root = spans.find(span => span.id === id);
  if (!root) {
    return;
  }

  return {
    ...root,
    children: spans
      .filter(span => span.parentId === id)
      .map(span => toTree(spans, span.id))
      .filter(tree => !!tree) as Node[]
  };
};
