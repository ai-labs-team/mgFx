import Store from 'electron-store';
import { SpanParameters } from '@mgfx/analyzer';

export type Server = {
  baseUrl: string;
  deltas?: boolean;
};

export type Schema = {
  inspectorPosition: 'side' | 'bottom';
  logDisplayMode: 'list' | 'tree';
  logParameters: SpanParameters;
  theme: 'light' | 'dark';
  servers: Server[];
};

export const config = new Store<Schema>({
  schema: {
    logDisplayMode: {
      enum: ['list', 'tree'],
      default: 'list',
    },
    logParameters: {
      type: 'object',
      default: {
        limit: 100,
        order: {
          field: 'createdAt',
          direction: 'desc',
        },
      } as SpanParameters,
    },
    inspectorPosition: {
      enum: ['side', 'bottom'],
      default: 'bottom',
    },
    theme: {
      enum: ['light', 'dark'],
      default: 'dark',
    },
    servers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          deltas: {
            type: 'boolean',
            default: true
          },
          baseUrl: {
            type: 'string',
            format: 'uri',
          },
        },
        required: ['baseUrl']
      },
      default: [],
    },
  },
});
