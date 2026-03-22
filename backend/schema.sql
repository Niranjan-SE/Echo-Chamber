-- Run this file in psql or pgAdmin to set up the database
-- Command: psql -U postgres -d echochamber -f schema.sql

-- Sessions (anonymous users)
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RSS Articles (auto-fetched)
CREATE TABLE IF NOT EXISTS rss_articles (
  id           SERIAL PRIMARY KEY,
  source       VARCHAR(100)  NOT NULL,
  title        TEXT          NOT NULL,
  url          TEXT          UNIQUE NOT NULL,
  summary      TEXT,
  tags         TEXT[]        DEFAULT '{}',
  image_url    TEXT,
  published_at TIMESTAMP,
  fetched_at   TIMESTAMP     DEFAULT NOW(),
  analysis_id  INT           -- filled after analysis
);

-- Submissions (manual URL paste OR from RSS)
CREATE TABLE IF NOT EXISTS submissions (
  id             SERIAL PRIMARY KEY,
  session_id     UUID          REFERENCES sessions(id),
  url            TEXT          NOT NULL,
  platform       VARCHAR(50),
  title          TEXT,
  source_type    VARCHAR(20)   DEFAULT 'manual', -- 'manual' | 'rss'
  rss_article_id INT           REFERENCES rss_articles(id),
  status         VARCHAR(20)   DEFAULT 'pending', -- pending | done | failed
  created_at     TIMESTAMP     DEFAULT NOW()
);

-- AI Analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id                   SERIAL PRIMARY KEY,
  submission_id        INT     REFERENCES submissions(id) ON DELETE CASCADE,
  echo_score           FLOAT,
  diversity_score      FLOAT,
  toxicity_score       FLOAT,
  dominant_emotion     VARCHAR(50),
  summary              TEXT,
  missing_perspectives TEXT,
  bias_clusters        JSONB,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- Community votes
CREATE TABLE IF NOT EXISTS votes (
  id            SERIAL PRIMARY KEY,
  submission_id INT         REFERENCES submissions(id) ON DELETE CASCADE,
  session_id    UUID        REFERENCES sessions(id),
  vote_type     VARCHAR(10) CHECK (vote_type IN ('toxic', 'healthy')),
  created_at    TIMESTAMP   DEFAULT NOW(),
  UNIQUE(submission_id, session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_status      ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at  ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_articles_fetched_at ON rss_articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_submission_id  ON analyses(submission_id);

-- Link rss_articles.analysis_id to analyses
ALTER TABLE rss_articles
  ADD CONSTRAINT fk_rss_analysis
  FOREIGN KEY (analysis_id) REFERENCES analyses(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
