import {
  Config,
  Key,
  GetConfig,
  GetKey,
  SetConfig,
  SetKey,
  ConfigReceiver,
  KeyReceiver,
  WatchConfig,
  WatchKey,
  defaults,
} from '@mgfx/analyzer-gui-common/config';

const LOCAL_STORAGE_KEY = 'MGFX_ANALYZER_CONFIG';

const configReceivers = new Set<ConfigReceiver>();
const keyReceivers = new Map<Key, Set<KeyReceiver<Key>>>();

const notify = (config: Config) => {
  configReceivers.forEach((receiver) => receiver(config));

  keyReceivers.forEach((receivers, key) => {
    receivers.forEach((receiver) => receiver(config[key]));
  });
};

export const getConfig: GetConfig = () => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return stored === null ? defaults : JSON.parse(stored);
};

export const getKey: GetKey = (key) => getConfig()[key];

export const setConfig: SetConfig = (config) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  notify(config);
};

export const setKey: SetKey = (key, value) => {
  const config = getConfig();
  config[key] = value;
  setConfig(config);
};

export const watchConfig: WatchConfig = (receiver) => {
  configReceivers.add(receiver);

  return () => configReceivers.delete(receiver);
};

export const watchKey: WatchKey = (key, receiver) => {
  let receivers = keyReceivers.get(key);
  if (!receivers) {
    receivers = new Set();
    keyReceivers.set(key, receivers);
  }

  receivers.add(receiver);

  return () => receivers.delete(receiver);
};
