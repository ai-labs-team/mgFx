-- Up
CREATE TABLE "events_heartbeat" (
    "timestamp" INTEGER,
    "id" TEXT,
    PRIMARY KEY("id", "timestamp")
);

ALTER TABLE spans ADD "last_heartbeat" INTEGER;

DROP VIEW "computed_spans";
CREATE VIEW "computed_spans" AS
    SELECT
        process_id AS id,
        process_parent_id AS parent_id,
        events_process.timestamp AS created_at,
        events_process.process_spec_name,
        input_id,
        events_process.context_id AS context_id,
        events_process.context_parent_id AS context_parent_id,
        events_process.context_values_id AS context_values_id,
        CASE
            WHEN events_resolution.id IS NOT NULL THEN 1
            WHEN events_rejection.id IS NOT NULL THEN 2
            WHEN events_cancellation.id IS NOT NULL THEN 3
            ELSE 0
        END AS state,
        COALESCE(
          events_rejection.timestamp,
          events_resolution.timestamp,
          events_cancellation.timestamp
        ) AS ended_at,
        COALESCE(
          events_rejection.reason_id,
          events_resolution.value_id
        ) AS output_id,
        latest_heartbeats.timestamp AS last_heartbeat
    FROM events_process
    LEFT JOIN events_resolution
        ON events_resolution.id = events_process.process_id
    LEFT JOIN events_rejection
        ON events_rejection.id = events_process.process_id
    LEFT JOIN events_cancellation
        ON events_cancellation.id = events_process.process_id
    LEFT JOIN (
        SELECT
            id,
            MAX(timestamp) AS timestamp
        FROM events_heartbeat
        GROUP BY id
    ) AS latest_heartbeats ON (latest_heartbeats.id = events_process.process_id)

-- Down
DROP TABLE "events_heartbeat";

ALTER TABLE "spans" RENAME TO "_spans";

CREATE TABLE "spans" (
	"id"	TEXT,
	"parent_id"	TEXT,
	"created_at"	INTEGER,
	"process_spec_name"	TEXT,
	"input_id"	INTEGER,
	"context_id"	TEXT,
	"context_parent_id"	TEXT,
	"context_values_id"	INTEGER NOT NULL,
	"state"	INTEGER,
	"ended_at"	INTEGER,
	"output_id"	INTEGER,
	FOREIGN KEY("input_id") REFERENCES "value_cache",
	FOREIGN KEY("context_values_id") REFERENCES "value_cache",
	FOREIGN KEY("output_id") REFERENCES "value_cache",
	PRIMARY KEY("id")
) WITHOUT ROWID;

INSERT INTO spans
  SELECT * FROM _spans;

DROP TABLE _spans;

DROP VIEW "computed_spans";
CREATE VIEW "computed_spans" AS
    SELECT
        process_id AS id,
        process_parent_id AS parent_id,
        events_process.timestamp AS created_at,
        events_process.process_spec_name,
        input_id,
        events_process.context_id AS context_id,
        events_process.context_parent_id AS context_parent_id,
        events_process.context_values_id AS context_values_id,
        CASE
            WHEN events_resolution.id IS NOT NULL THEN 1
            WHEN events_rejection.id IS NOT NULL THEN 2
            WHEN events_cancellation.id IS NOT NULL THEN 3
            ELSE 0
        END AS state,
        COALESCE(
          events_rejection.timestamp,
          events_resolution.timestamp,
          events_cancellation.timestamp
        ) AS ended_at,
        COALESCE(
          events_rejection.reason_id,
          events_resolution.value_id
        ) AS output_id
    FROM events_process
    LEFT JOIN events_resolution
        ON events_resolution.id = events_process.process_id
    LEFT JOIN events_rejection
        ON events_rejection.id = events_process.process_id
    LEFT JOIN events_cancellation
        ON events_cancellation.id = events_process.process_id