import { Span } from '@mgfx/analyzer';

export const isParentOf = (a: Span) => (b: Span) => b.id === a.parentId;
export const isChildOf = (a: Span) => (b: Span) => b.parentId === a.id;

export const isRoot = (self: Span) => !self.parentId;

export const isOrphan = (self: Span, others: Span[]) =>
  !others.find(isParentOf(self));

export const rootsAndOrphansIn = (spans: Span[]) =>
  spans.filter((span) => isRoot(span) || isOrphan(span, spans));

export const childrenOf = (self: Span, others: Span[]) =>
  others.filter(isChildOf(self));
