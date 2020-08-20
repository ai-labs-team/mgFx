-- Up
CREATE INDEX created_at ON spans (created_at);
CREATE INDEX process_spec_name ON spans (process_spec_name);

-- Down
DROP INDEX created_at;