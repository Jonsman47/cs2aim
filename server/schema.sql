CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  cooldowns JSONB NOT NULL DEFAULT '{}'::jsonb,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_from_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  strict_feedback_cooldown_minutes INTEGER,
  name_color TEXT,
  admin_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_lower_idx
  ON accounts (LOWER(username));

CREATE TABLE IF NOT EXISTS anonymous_profiles (
  profile_id TEXT PRIMARY KEY,
  display_id TEXT NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  alias TEXT,
  hidden_from_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  transferred_to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  anonymous_profile_id TEXT REFERENCES anonymous_profiles(profile_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS progression_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  xp_delta INTEGER NOT NULL,
  shots_delta INTEGER NOT NULL,
  kills_delta INTEGER NOT NULL,
  headshots_delta INTEGER NOT NULL,
  wallbangs_delta INTEGER NOT NULL,
  cumulative_reaction_delta DOUBLE PRECISION NOT NULL,
  qualifying_reaction_delta DOUBLE PRECISION NOT NULL,
  qualifying_reaction_count_delta INTEGER NOT NULL,
  fastest_reaction_candidate DOUBLE PRECISION,
  best_score_candidate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progression_events_actor_idx
  ON progression_events (actor_type, actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback_posts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  author_name TEXT NOT NULL,
  account_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS feedback_posts_created_idx
  ON feedback_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_site_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO admin_site_state (singleton, state_json)
VALUES (TRUE, '{}'::jsonb)
ON CONFLICT (singleton) DO NOTHING;
