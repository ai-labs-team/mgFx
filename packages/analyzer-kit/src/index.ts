#!/usr/bin/env node

import { makeAnalyzer } from '@mgfx/analyzer';
import { sqlite } from '@mgfx/analyzer-storage-sqlite';
import { httpServer } from '@mgfx/analyzer-http-server';
import { join } from 'path';
import express from 'express';

const config = {
  storage: {
    filename:
      process.env.ANALYZER_STORAGE_FILENAME ||
      join(process.cwd(), 'mgfx-analyzer.sqlite'),
  },
  buffer: {
    time: parseInt(process.env.ANALYZER_BUFFER_TIME || ''),
    count: parseInt(process.env.ANALYZER_BUFFER_COUNT || ''),
  },
  http: {
    port: process.env.ANALYZER_HTTP_PORT || 8080,
  },
};

const buffer =
  config.buffer.time || config.buffer.count
    ? {
        enabled: true as const,
        count: config.buffer.count || 25,
        time: config.buffer.time || 250,
      }
    : undefined;

express()
  .use(
    httpServer({
      analyzer: makeAnalyzer({
        storage: sqlite({
          filename: config.storage.filename,
        }),
        buffer,
      }),
    })
  )
  .listen(config.http.port, () => {
    console.info(`Analyzer HTTP Server started on port ${config.http.port}`);
    console.info(`SQLite Storage location: ${config.storage.filename}`);
    console.info(`Event buffering: ${buffer ? 'enabled' : 'disabled'}`);
    if (buffer) {
      console.info(`  Buffer size: ${buffer.count} events`);
      console.info(`  Buffer time: ${buffer.time} ms`);
    }
  });
