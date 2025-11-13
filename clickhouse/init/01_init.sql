-- Initialize database and alerts table for Vector ingestion
CREATE DATABASE IF NOT EXISTS observability;

CREATE TABLE IF NOT EXISTS observability.alerts
(
    id String,
    ts DateTime64(3, 'UTC') DEFAULT now64(),
    level LowCardinality(String) DEFAULT 'INFO',
    message String DEFAULT '',
    payload String,              -- raw JSON payload (original record)
    source_file LowCardinality(String) DEFAULT '',
    source_offset UInt64 DEFAULT 0,
    ingested_at DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = MergeTree
ORDER BY (ts, id)
SETTINGS index_granularity = 8192;
