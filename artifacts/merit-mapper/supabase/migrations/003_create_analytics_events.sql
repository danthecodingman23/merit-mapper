-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- First-party funnel analytics. Deliberately stores NO IP address and NO
-- user-agent string: attribution is carried by a first-party random session
-- id, so this table holds no data that identifies a visitor beyond the
-- user_id they already gave us at signup.

CREATE TABLE IF NOT EXISTS analytics_events (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- random uuid minted in the browser on first visit, kept in localStorage.
  -- this is what stitches an anonymous visitor to the user they become.
  session_id   UUID NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  event        TEXT NOT NULL,
  path         TEXT,

  -- first-touch attribution, copied onto every event from the session
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  utm_term     TEXT,
  click_id     TEXT,          -- gclid (Google) or rdt_cid (Reddit)
  referrer     TEXT,

  meta         JSONB
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_idx      ON analytics_events (event);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx    ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_source_idx     ON analytics_events (utm_source);

-- No public policies: RLS on with zero policies means the anon key cannot
-- read or write this table at all. Writes go through /api/track and reads
-- through /api/admin/funnel, both using the service role key server-side.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
