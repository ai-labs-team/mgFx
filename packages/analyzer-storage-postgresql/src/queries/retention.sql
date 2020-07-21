DELETE
FROM events
WHERE (event -> 'timestamp')::bigint < (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000) - ${maxAge};

DELETE
FROM spans
WHERE "endedAt" < (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000) - ${maxAge};