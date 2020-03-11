import * as utils from './utils';
import { Span } from './query';

describe('toTree', () => {
  it('converts an array of Spans to a tree-like structure', () => {
    const spans = [
      {
        id: '1',
        parentId: undefined
      },
      {
        id: '2',
        parentId: '1'
      },
      {
        id: '3',
        parentId: '1'
      },
      {
        id: '4',
        parentId: '2'
      }
    ];

    const tree = utils.toTree(spans as Span[], '1');
    expect(tree).toEqual({
      id: '1',
      parentId: undefined,
      children: [
        {
          id: '2',
          parentId: '1',
          children: [
            {
              id: '4',
              parentId: '2',
              children: []
            }
          ]
        },
        {
          id: '3',
          parentId: '1',
          children: []
        }
      ]
    });
  });
});
