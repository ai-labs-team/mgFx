/**
 * Gets a value from the value cache; returns an empty result set if it doesn't already exist
 */
export const getCachedValue = `
SELECT rowid FROM value_cache WHERE content = ?
`;

/**
 * Inserts a value into the value cache when it doesn't already exist
 */
export const cacheValue = `
INSERT INTO value_cache VALUES (?);
`;

/**
 * Inserts a row into the `events_process` table; used to store Events where `event.kind === 'process'`
 */
export const putEventProcess = `
INSERT INTO events_process (
  input_id,
  context_values_id,
  timestamp,
  process_spec_name,
  process_id,
  process_parent_id,
  context_id,
  context_parent_id
) VALUES (
  $inputId,
  $contextValuesId,
  $timestamp,
  $processSpecName,
  $processId,
  $processParentId,
  $contextId,
  $contextParentId
);
`;

/**
 * Inserts a row into the `events_resolution` table; used to store Events where `event.kind === 'resolution'`
 */
export const putEventResolution = `
INSERT INTO events_resolution (
  value_id,
  timestamp,
  id
) VALUES (
  $valueId,
  $timestamp,
  $id
)
`;

/**
 * Inserts a row into the `events_rejection` table; used to store Events where `event.kind === 'rejection'`
 */
export const putEventRejection = `
INSERT INTO events_rejection (
  reason_id,
  timestamp,
  id
) VALUES (
  $reasonId,
  $timestamp,
  $id
)
`;

/**
 * Inserts a row into the `events_cancellation` table; used to store Events where `event.kind === 'cancellation'`
 */
export const putEventCancellation = `
INSERT INTO events_cancellation (
  timestamp,
  id
) VALUES (
  $timestamp,
  $id
)
`;

/**
 * Updates a row in the `spans` table based upon the result of the `computed_spans` view for a specific process ID
 */
export const updateSpan = `
REPLACE INTO spans
  SELECT *
  FROM computed_spans
  WHERE id = ?
`;
