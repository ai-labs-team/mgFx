import { Span } from '@mgfx/analyzer';

import * as timeline from './renderer';

describe('render', () => {
  it('correctly renders a simple layout', () => {
    const result = timeline.render(data1);
    expect(result).toEqual(expectedLayout1);
  });

  it.only('correctly renders a moderately complex layout', () => {
    const result = timeline.render(data2);
    expect(result).toEqual(expectedLayout2);
  });
});

describe('optimize', () => {
  it('computes visible rows and cells', () => {
    const visible = timeline.optimize(timeline.render(data1), [2, 8], [11, 19]);
    expect(visible).toEqual(expectedVisibleLayout1);
  });

  it('coalesces cells within an optional time threshold', () => {
    const visible = timeline.optimize(
      timeline.render(data1),
      [2, 8],
      [11, 19],
      10
    );

    expect(visible).toEqual(expectedVisibleLayout2);
  });
});

describe('compareByTime', () => {
  it('orders children after parents', () => {
    const spans = [data1[2], data1[0], data1[3]];
    expect(spans.sort(timeline.compareByTime)).toEqual([
      data1[0],
      data1[2],
      data1[3],
    ]);
  });

  it('orders Spans by start time', () => {
    const spans = [data1[2], data1[0]];
    expect(spans.sort(timeline.compareByTime)).toEqual([data1[0], data1[2]]);
  });

  it('orders Spans by end time when starts are equal', () => {
    const spans = [data1[7], data1[6]];
    expect(spans.sort(timeline.compareByTime)).toEqual([data1[6], data1[7]]);
  });

  it('orders un-ended Spans after ended Spans when starts are equal', () => {
    const running: Span = {
      id: 'a_',
      createdAt: 0,
      process: { spec: { name: 'A_' } },
      state: 'running',
    };

    const spans = [running, data1[0]];

    expect(spans.sort(timeline.compareByTime)).toEqual([data1[0], running]);
  });
});

const data1: Span[] = [
  {
    id: 'a',
    createdAt: 0,
    process: { spec: { name: 'A' } },
    state: 'resolved',
    endedAt: 10,
  },
  {
    id: 'b',
    parentId: 'a',
    createdAt: 0,
    process: { spec: { name: 'A.B' } },
    state: 'resolved',
    endedAt: 10,
  },
  {
    id: 'c',
    parentId: 'b',
    createdAt: 9,
    process: { spec: { name: 'A.B.C' } },
    state: 'resolved',
    endedAt: 10,
  },
  {
    id: 'd',
    parentId: 'a',
    createdAt: 10,
    process: { spec: { name: 'A.D' } },
    state: 'resolved',
    endedAt: 20,
  },
  {
    id: 'e',
    parentId: 'd',
    createdAt: 12,
    process: { spec: { name: 'A.D.E' } },
    state: 'resolved',
    endedAt: 20,
  },
  {
    id: 'f',
    parentId: 'e',
    createdAt: 13,
    process: { spec: { name: 'A.D.E.F' } },
    state: 'resolved',
    endedAt: 20,
  },
  {
    id: 'g',
    parentId: 'e',
    createdAt: 20,
    process: { spec: { name: 'A.D.E.G' } },
    state: 'resolved',
    endedAt: 21,
  },
  {
    id: 'h',
    parentId: 'e',
    createdAt: 20,
    process: { spec: { name: 'A.D.E.H' } },
    state: 'resolved',
    endedAt: 25,
  },
  {
    id: 'i',
    parentId: 'h',
    createdAt: 20,
    process: { spec: { name: 'A.D.E.H.I' } },
    state: 'resolved',
    endedAt: 25,
  },
  {
    id: 'j',
    parentId: 'd',
    createdAt: 13,
    process: { spec: { name: 'A.D.J' } },
    state: 'resolved',
    endedAt: 24,
  },
  {
    id: 'k',
    parentId: 'j',
    createdAt: 16,
    process: { spec: { name: 'A.D.J.K' } },
    state: 'resolved',
    endedAt: 17,
  },
  {
    id: 'l',
    parentId: 'j',
    createdAt: 17,
    process: { spec: { name: 'A.D.J.L' } },
    state: 'resolved',
    endedAt: 24,
  },
  {
    id: 'm',
    parentId: 'j',
    createdAt: 20,
    process: { spec: { name: 'A.D.J.M' } },
    state: 'resolved',
    endedAt: 30,
  },
  {
    id: 'n',
    parentId: 'm',
    createdAt: 20,
    process: { spec: { name: 'A.D.J.M.N' } },
    state: 'resolved',
    endedAt: 29,
  },
  {
    id: 'x',
    createdAt: 10,
    process: { spec: { name: 'X' } },
    state: 'resolved',
    endedAt: 15,
  },
  {
    id: 'z',
    parentId: 'y',
    createdAt: 40,
    process: { spec: { name: 'Y.Z' } },
    state: 'resolved',
    endedAt: 50,
  },
];

const data2: Span[] = data1
  .concat([
    {
      id: '!a',
      parentId: undefined,
      createdAt: 0,
      process: { spec: { name: '!A' } },
      state: 'running',
    },
    {
      id: '!b',
      parentId: undefined,
      createdAt: 10,
      process: { spec: { name: '!B' } },
      state: 'running',
    },
  ])
  .concat(
    data1.map(
      (span) =>
        ({
          ...span,
          id: span.id + '_',
          parentId: span.parentId ? span.parentId + '_' : undefined,
          process: {
            spec: {
              name: span.process.spec.name + '_',
            },
          },
          createdAt: span.createdAt + 100,
          endedAt: 'endedAt' in span ? span.endedAt + 100 : undefined,
        } as any)
    )
  )
  .sort(timeline.compareByTime);

const expectedLayout1: timeline.Layout = [
  0,
  50,
  [
    [
      ['a', undefined, 'A', 'resolved', 0, 10],
      ['z', 'y', 'Y.Z', 'resolved', 40, 50],
    ],
    [
      ['b', 'a', 'A.B', 'resolved', 0, 10],
      ['d', 'a', 'A.D', 'resolved', 10, 20],
    ],
    [
      ['c', 'b', 'A.B.C', 'resolved', 9, 10],
      ['e', 'd', 'A.D.E', 'resolved', 12, 20],
    ],
    [
      ['f', 'e', 'A.D.E.F', 'resolved', 13, 20],
      ['g', 'e', 'A.D.E.G', 'resolved', 20, 21],
    ],
    [['h', 'e', 'A.D.E.H', 'resolved', 20, 25]],
    [['i', 'h', 'A.D.E.H.I', 'resolved', 20, 25]],
    [['j', 'd', 'A.D.J', 'resolved', 13, 24]],
    [
      ['k', 'j', 'A.D.J.K', 'resolved', 16, 17],
      ['l', 'j', 'A.D.J.L', 'resolved', 17, 24],
    ],
    [['m', 'j', 'A.D.J.M', 'resolved', 20, 30]],
    [['n', 'm', 'A.D.J.M.N', 'resolved', 20, 29]],
    [['x', undefined, 'X', 'resolved', 10, 15]],
  ],
];

const expectedLayout2: timeline.Layout = [
  0,
  undefined,
  [
    [
      ['a', undefined, 'A', 'resolved', 0, 10],
      ['z', 'y', 'Y.Z', 'resolved', 40, 50],
      ['a_', undefined, 'A_', 'resolved', 100, 110],
      ['z_', 'y_', 'Y.Z_', 'resolved', 140, 150],
    ],
    [
      ['b', 'a', 'A.B', 'resolved', 0, 10],
      ['d', 'a', 'A.D', 'resolved', 10, 20],
      ['b_', 'a_', 'A.B_', 'resolved', 100, 110],
      ['d_', 'a_', 'A.D_', 'resolved', 110, 120],
    ],
    [
      ['c', 'b', 'A.B.C', 'resolved', 9, 10],
      ['e', 'd', 'A.D.E', 'resolved', 12, 20],
      ['c_', 'b_', 'A.B.C_', 'resolved', 109, 110],
      ['e_', 'd_', 'A.D.E_', 'resolved', 112, 120],
    ],
    [
      ['f', 'e', 'A.D.E.F', 'resolved', 13, 20],
      ['g', 'e', 'A.D.E.G', 'resolved', 20, 21],
      ['f_', 'e_', 'A.D.E.F_', 'resolved', 113, 120],
      ['g_', 'e_', 'A.D.E.G_', 'resolved', 120, 121],
    ],
    [
      ['h', 'e', 'A.D.E.H', 'resolved', 20, 25],
      ['h_', 'e_', 'A.D.E.H_', 'resolved', 120, 125],
    ],
    [
      ['i', 'h', 'A.D.E.H.I', 'resolved', 20, 25],
      ['i_', 'h_', 'A.D.E.H.I_', 'resolved', 120, 125],
    ],
    [
      ['j', 'd', 'A.D.J', 'resolved', 13, 24],
      ['j_', 'd_', 'A.D.J_', 'resolved', 113, 124],
    ],
    [
      ['k', 'j', 'A.D.J.K', 'resolved', 16, 17],
      ['l', 'j', 'A.D.J.L', 'resolved', 17, 24],
      ['k_', 'j_', 'A.D.J.K_', 'resolved', 116, 117],
      ['l_', 'j_', 'A.D.J.L_', 'resolved', 117, 124],
    ],
    [
      ['m', 'j', 'A.D.J.M', 'resolved', 20, 30],
      ['m_', 'j_', 'A.D.J.M_', 'resolved', 120, 130],
    ],
    [
      ['n', 'm', 'A.D.J.M.N', 'resolved', 20, 29],
      ['n_', 'm_', 'A.D.J.M.N_', 'resolved', 120, 129],
    ],
    [['!a', undefined, '!A', 'running', 0, undefined]],
    // @TODO: !b should appear here
    [
      ['x', undefined, 'X', 'resolved', 10, 15],
      ['x_', undefined, 'X_', 'resolved', 110, 115],
    ],
    [['!b', undefined, '!B', 'running', 10, undefined]],
  ],
];

const expectedVisibleLayout1: timeline.OptimizedLayout = [
  [2, [[['e', 'd', 'A.D.E', 'resolved', 12, 20], 0]]],
  [3, [[['f', 'e', 'A.D.E.F', 'resolved', 13, 20], 0]]],
  [6, [[['j', 'd', 'A.D.J', 'resolved', 13, 24], 0]]],
  [
    7,
    [
      [['k', 'j', 'A.D.J.K', 'resolved', 16, 17], 0],
      [['l', 'j', 'A.D.J.L', 'resolved', 17, 24], 0],
    ],
  ],
];

const expectedVisibleLayout2: timeline.OptimizedLayout = [
  [2, [[['e', 'd', 'A.D.E', 'resolved', 12, 20], 0]]],
  [3, [[['f', 'e', 'A.D.E.F', 'resolved', 13, 20], 0]]],
  [6, [[['j', 'd', 'A.D.J', 'resolved', 13, 24], 0]]],
  [7, [[['k', 'j', 'A.D.J.K', 'resolved', 16, 17], 1, 24]]],
];
