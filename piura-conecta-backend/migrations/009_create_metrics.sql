-- Migration: create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  key TEXT PRIMARY KEY,
  value BIGINT DEFAULT 0
);
