-- Up
CREATE TABLE "value_cache" (
	"content" TEXT NOT NULL UNIQUE
);

DROP TABLE "events_process";
CREATE TABLE "events_process" (
	"timestamp"	INTEGER,
	"process_spec_name"	TEXT,
	"process_id"	TEXT,
	"process_parent_id"	TEXT,
	"input_id"	INTEGER NOT NULL,
	"context_id"	TEXT,
	"context_parent_id"	TEXT,
	"context_values_id"	INTEGER NOT NULL,
	FOREIGN KEY("input_id") REFERENCES "value_cache",
	FOREIGN KEY("context_values_id") REFERENCES "value_cache",
	PRIMARY KEY("process_id")
) WITHOUT ROWID;

DROP TABLE "events_resolution";
CREATE TABLE "events_resolution" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"value_id"	INTEGER NOT NULL,
	FOREIGN KEY("value_id") REFERENCES "value_cache",
	PRIMARY KEY("id")
) WITHOUT ROWID;

DROP TABLE "events_rejection";
CREATE TABLE "events_rejection" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"reason_id"	INTEGER NOT NULL,
	FOREIGN KEY("reason_id") REFERENCES "value_cache",
	PRIMARY KEY("id")
) WITHOUT ROWID;

DROP TABLE "spans";
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
	"resolved_at"	INTEGER,
	"value_id"	INTEGER,
	"rejected_at"	INTEGER,
	"reason_id"	INTEGER,
	"cancelled_at"	INTEGER,
	FOREIGN KEY("input_id") REFERENCES "value_cache",
	FOREIGN KEY("context_values_id") REFERENCES "value_cache",
	FOREIGN KEY("value_id") REFERENCES "value_cache",
	FOREIGN KEY("reason_id") REFERENCES "value_cache",
	PRIMARY KEY("id")
) WITHOUT ROWID;

CREATE INDEX "spans_parent_id" ON spans(parent_id);

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
        events_resolution.timestamp AS 'resolved_at',
        events_resolution.value_id AS value_id,
        events_rejection.timestamp AS 'rejected_at',
        events_rejection.reason_id AS reason_id,
        events_cancellation.timestamp AS 'cancelled_at'
    FROM events_process
    LEFT JOIN events_resolution
        ON events_resolution.id = events_process.process_id
    LEFT JOIN events_rejection
        ON events_rejection.id = events_process.process_id
    LEFT JOIN events_cancellation
        ON events_cancellation.id = events_process.process_id

-- Down
DROP VIEW "computed_spans"
CREATE VIEW "computed_spans" AS
    SELECT
        process_id AS id,
        process_parent_id AS parent_id,
        events_process.timestamp AS created_at,
        events_process.process_spec_name,
        input,
        events_process.context_id AS context_id,
        events_process.context_parent_id AS context_parent_id,
        events_process.context_values AS context_values,
        CASE
            WHEN events_resolution.id IS NOT NULL THEN 'resolved'
            WHEN events_rejection.id IS NOT NULL THEN 'rejected'
            WHEN events_cancellation.id IS NOT NULL THEN 'cancelled'
            ELSE 'running'
        END AS state,
        events_resolution.timestamp AS 'resolved_at',
        events_resolution.value AS value,
        events_rejection.timestamp AS 'rejected_at',
        events_rejection.reason AS reason,
        events_cancellation.timestamp AS 'cancelled_at'
    FROM events_process
    LEFT JOIN events_resolution
        ON events_resolution.id = events_process.process_id
    LEFT JOIN events_rejection
        ON events_rejection.id = events_process.process_id
    LEFT JOIN events_cancellation
        ON events_cancellation.id = events_process.process_id;

DROP TABLE "spans";
CREATE TABLE "spans" (
	"id"	TEXT,
	"parent_id"	TEXT,
	"created_at"	INTEGER,
	"process_spec_name"	TEXT,
	"input"	TEXT,
	"context_id"	TEXT,
	"context_parent_id"	TEXT,
	"context_values"	TEXT,
	"state"	TEXT,
	"resolved_at"	INTEGER,
	"value"	TEXT,
	"rejected_at"	INTEGER,
	"reason"	TEXT,
	"cancelled_at"	INTEGER,
	PRIMARY KEY("id")
) WITHOUT ROWID;

DROP TABLE "events_process";
CREATE TABLE "events_process" (
	"timestamp"	INTEGER,
	"process_spec_name"	TEXT,
	"process_id"	TEXT,
	"process_parent_id"	TEXT,
	"input"	TEXT,
	"context_id"	TEXT,
	"context_parent_id"	TEXT,
	"context_values"	TEXT,
	PRIMARY KEY("process_id")
) WITHOUT ROWID;

DROP TABLE "events_resolution";
CREATE TABLE "events_resolution" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"value"	TEXT,
	PRIMARY KEY("id")
) WITHOUT ROWID;

DROP TABLE "events_rejection";
CREATE TABLE "events_rejection" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"reason"	TEXT,
	PRIMARY KEY("id")
) WITHOUT ROWID;

DROP TABLE "value_cache";