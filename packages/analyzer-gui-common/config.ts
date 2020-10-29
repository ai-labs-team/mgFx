import { SpanParameters } from '@mgfx/analyzer';

export interface Config {
  inspectorPosition: 'side' | 'bottom';
  logDisplayMode: 'list' | 'tree';
  logParameters: SpanParameters;
  theme: 'light' | 'dark';
}

export type Key = keyof Config;
export type Value<K extends Key> = Config[K];

export type GetConfig = () => Config;
export type GetKey = <K extends Key>(key: K) => Value<K>;

export type SetConfig = (config: Config) => void;
export type SetKey = <K extends Key>(key: K, value: Value<K>) => void;

export type ConfigReceiver = (config: Config) => void;
export type WatchConfig = (receiver: ConfigReceiver) => () => void;

export type KeyReceiver<K extends Key> = (value: Config[K]) => void;
export type WatchKey = <K extends Key>(
  key: K,
  receiver: KeyReceiver<K>
) => () => void;

export const defaults: Config = {
  logDisplayMode: 'list',
  logParameters: {
    limit: 100,
    order: {
      field: 'createdAt',
      direction: 'desc',
    },
  },
  inspectorPosition: 'bottom',
  theme: 'dark',
};
