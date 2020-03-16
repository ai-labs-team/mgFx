-- Up
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

CREATE TABLE "events_resolution" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"value"	TEXT,
	PRIMARY KEY("id")
) WITHOUT ROWID;

CREATE TABLE "events_rejection" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	"reason"	TEXT,
	PRIMARY KEY("id")
) WITHOUT ROWID;

CREATE TABLE "events_cancellation" (
	"timestamp"	INTEGER,
	"id"	TEXT,
	PRIMARY KEY("id")
) WITHOUT ROWID;

-- Down
DROP TABLE "events_process";
DROP TABLE "events_resolution";
DROP TABLE "events_rejection";
DROP TABLE "events_cancellation";