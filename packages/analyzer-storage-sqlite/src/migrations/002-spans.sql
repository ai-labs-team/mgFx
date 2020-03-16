-- Up
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

CREATE INDEX "spans_parent_id" ON spans(parent_id);

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
        ON events_cancellation.id = events_process.process_id

-- Down
DROP TABLE "spans";
DROP INDEX "spans_parent_id";
DROP VIEW "computed_spans";