import { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder) => {
  /**
   * A table to store raw, incoming events. Records in this table are INSERTed directly via the Storage provider.
   */
  pgm.createTable('events', {
    event: {
      type: 'jsonb',
      notNull: true,
    },
  });

  /**
   * A table to store Spans that have been constructed from event data. Records in this table are populated by a
   * post-INSERT trigger on the 'events' table.
   */
  pgm.createTable('spans', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    parentId: 'uuid',
    createdAt: 'bigint',
    process: 'jsonb',
    input: 'jsonb',
    context: 'jsonb',
    state: 'character varying (16)',
    endedAt: 'bigint',
    output: 'jsonb'
  });

  /**
   * To aid querying of spans that are children of some other span, we add an explicit index on 'parentId'.
   */
  pgm.createIndex('spans', 'parentId');

  /**
   * Queries against process.spec.name are common too, so add an index for that
   */
  pgm.createIndex('spans', `(process #>> '{spec,name}')`);

  /**
   * The post-INSERT trigger on the 'events' table that takes care of keeping the 'spans' table up-to-date.
   * We use a trigger here to reduce the size and number of queries going 'over the wire'.
   */
  pgm.createTrigger('events', 'upsert_span', {
    when: 'AFTER',
    operation: 'INSERT',
    language: 'plpgsql',
    level: 'ROW'
  }, `
BEGIN
  CASE (NEW.event ->> 'kind')
    WHEN 'process' THEN
      /**
       * When 'kind' is 'process', create and insert a new 'span' record
       */
      INSERT INTO spans
      VALUES (
        -- id
        (NEW.event #>> '{process,id}')::uuid,

        -- parentId
        (NEW.event #>> '{process,parentId}')::uuid,

        -- createdAt
        (NEW.event ->> 'timestamp')::bigint,

        -- process
        jsonb_build_object('spec', jsonb_build_object('name', NEW.event #>> '{process,spec,name}')),

        -- input
        NEW.event #> '{process,input}',

        -- context
        NEW.event #> '{process,context}',

        -- state
        'running'
      )
      /**
       * In the edge cases where the result event was received before the process event, a Span will already exist, so
       * we need to 'fill in' the missing columns that are only available from a 'process' event.
       */
      ON CONFLICT (id) DO UPDATE
      SET
        "parentId" = EXCLUDED."parentId",
        "createdAt" = EXCLUDED."createdAt",
        process = EXCLUDED.process,
        input = EXCLUDED.input,
        context = EXCLUDED.context;

    WHEN 'rejection' THEN
      /**
       * To ensure that the Span definitely exists (either partially or completely), we attempt an insert first.
       */
      INSERT INTO spans (
        id,
        "endedAt",
        state,
        output
      )
      VALUES (
        (NEW.event ->> 'id')::uuid,
        (NEW.event ->> 'timestamp')::bigint,
        'rejected',
        (NEW.event -> 'reason')
      )
      /**
       * If the insert fails due to a conflicting 'id', then it's because the 'process' handler above already created a
       * Span, so just update the existing one.
       */
      ON CONFLICT (id) DO UPDATE
      SET
        "endedAt" = EXCLUDED."endedAt",
        state = 'rejected',
        output = EXCLUDED.output;

    WHEN 'resolution' THEN
      INSERT INTO spans (
        id,
        "endedAt",
        state,
        output
      )
      VALUES (
        (NEW.event ->> 'id')::uuid,
        (NEW.event ->> 'timestamp')::bigint,
        'resolved',
        (NEW.event -> 'value')
      )
      ON CONFLICT (id) DO UPDATE
      SET
        "endedAt" = EXCLUDED."endedAt",
        state = 'resolved',
        output = EXCLUDED.output;

    WHEN 'cancellation' THEN
      INSERT INTO spans (
        id,
        "endedAt",
        state
      )
      VALUES (
        (NEW.event ->> 'id')::uuid,
        (NEW.event ->> 'timestamp')::bigint,
        'cancelled'
      )
      ON CONFLICT (id) DO UPDATE
      SET
        "endedAt" = EXCLUDED."endedAt",
        state = 'cancelled',
        output = NULL;
  END CASE;

  RETURN NULL;
END;
`);
}