#!/usr/bin/env node

import { makeAnalyzer } from '@mgfx/analyzer';
import { sqlite } from '@mgfx/analyzer-storage-sqlite';
import { postgresql } from '@mgfx/analyzer-storage-postgresql';
import { httpServer } from '@mgfx/analyzer-http-server';
import { ConnectionString }  from 'connection-string';
import { join } from 'path';
import express from 'express';

const config = {
  storage: {
    provider: process.env.ANALYZER_STORAGE_PROVIDER || 'sqlite',
    filename:
      process.env.ANALYZER_STORAGE_FILENAME ||
      join(process.cwd(), 'mgfx-analyzer.sqlite'),
    postgresUrl: process.env.ANALYZER_STORAGE_POSTGRES_URL || 'postgres://localhost/mgfx'
  },
  buffer: {
    time: parseInt(process.env.ANALYZER_BUFFER_TIME || ''),
    count: parseInt(process.env.ANALYZER_BUFFER_COUNT || ''),
  },
  http: {
    port: process.env.ANALYZER_HTTP_PORT || 8080,
  },
  collector: {
    enabled: process.env.ANALYZER_COLLECTOR_ENABLED !== 'false',
    sizeLimit: process.env.ANALYZER_COLLECTOR_SIZE_LIMIT || '100kb',
  },
  retention: process.env.ANALYZER_RETENTION_ENABLED !== 'false' ? {
    maxAge: process.env.ANALYZER_RETENTION_MAX_AGE
      ? parseInt(process.env.ANALYZER_RETENTION_MAX_AGE)
      : 10 * 24 * 60 * 60 * 1000,

    checkInterval: process.env.ANALYZER_RETENTION_CHECK_INTERVAL
      ? parseInt(process.env.ANALYZER_RETENTION_CHECK_INTERVAL)
      : 60 * 60 * 1000,
  } : undefined,
};

const buffer =
  config.buffer.time || config.buffer.count
    ? {
        enabled: true as const,
        count: config.buffer.count || 25,
        time: config.buffer.time || 250,
      }
    : undefined;

const storage = config.storage.provider === 'postgresql' ?
  postgresql({
    database: config.storage.postgresUrl
  }) : sqlite({
    filename: config.storage.filename
  });

const analyzer = makeAnalyzer({
  retention: config.retention,
  storage,
  buffer,
});

if (config.retention) {
  analyzer.retention.value(() => {});
}

express()
  .use(
    httpServer({
      analyzer,
      collector: config.collector,
    })
  )
  .listen(config.http.port, () => {
    console.info(`Analyzer HTTP Server started on port ${config.http.port}`);
    if (config.storage.provider === 'postgresql') {
      const cs = new ConnectionString(config.storage.postgresUrl);
      if (cs.password) {
        cs.password = '***REDACTED***'
      }

      console.info(`PostgreSQL Connection URL: ${cs.toString()}`);
    } else {
      console.info(`SQLite Storage location: ${config.storage.filename}`);
    }

    console.info(`Event buffering: ${buffer ? 'enabled' : 'disabled'}`);
    if (buffer) {
      console.info(`  Buffer size: ${buffer.count.toLocaleString()} events`);
      console.info(`  Buffer time: ${buffer.time.toLocaleString()} ms`);
    }

    console.info(`Collector: ${config.collector.enabled}`);
    console.info(`  Size limit: ${config.collector.sizeLimit}`);

    console.info(`Retention: ${config.retention ? 'enabled' : 'disabled'}`);
    if (config.retention) {
      console.info(`  Max age:        ${config.retention.maxAge.toLocaleString()} ms`);
      console.info(`  Check Interval: ${config.retention.checkInterval.toLocaleString()} ms`);
    }
  });
