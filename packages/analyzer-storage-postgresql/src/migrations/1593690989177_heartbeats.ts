import { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder) => {
  pgm.addColumn('spans', {
    heartbeat: {
      type: 'jsonb'
    }
  });

  pgm.createFunction('upsert_span', [], {
    replace: true,
    language: 'plpgsql',
    returns: 'TRIGGER'
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
        context = EXCLUDED.context,
        state = COALESCE(spans.state, EXCLUDED.state);

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

    WHEN 'heartbeat' THEN
      INSERT INTO spans (
        id,
        heartbeat
      )
      VALUES (
        (NEW.event ->> 'id')::uuid,
        jsonb_build_object('last', (NEW.event ->> 'timestamp')::bigint)
      )
      ON CONFLICT (id) DO UPDATE
      SET
        heartbeat = EXCLUDED.heartbeat
      WHERE
        (spans.heartbeat -> 'last') IS NULL OR
        (spans.heartbeat -> 'last') < (EXCLUDED.heartbeat -> 'last');

  END CASE;

  RETURN NULL;
END;
`);
};

export const down = async (pgm: MigrationBuilder) => {
  pgm.createFunction(
    'upsert_span',
    [],
    {
      replace: true,
      language: 'plpgsql',
      returns: 'TRIGGER',
    },
    `
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
`
  );

  pgm.dropColumn('spans', 'heartbeat');
};