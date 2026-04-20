-- Enable pg_cron extension for materialized view refresh
-- (enable in Supabase dashboard under Extensions if not available)

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym         TEXT NOT NULL UNIQUE,
  avatar_seed       TEXT,
  institution       TEXT,
  is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  total_points      INTEGER NOT NULL DEFAULT 0,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_active_date  DATE,
  onboarding_done   BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_element TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TAXONOMY TERMS (seeded from Excel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.taxonomy_terms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_code     TEXT NOT NULL UNIQUE,
  element       TEXT NOT NULL,
  level_1       TEXT,
  level_2       TEXT,
  level_3       TEXT,
  definition    TEXT,
  include_if    TEXT,
  exclude_if    TEXT,
  cgiar_example TEXT,
  related_terms TEXT[] DEFAULT '{}',
  reference     TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_proposed   BOOLEAN NOT NULL DEFAULT FALSE,
  proposed_by   UUID REFERENCES public.profiles(id),
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEW ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id      UUID NOT NULL REFERENCES public.taxonomy_terms(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date     TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_s INTEGER,
  UNIQUE(term_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_term     ON public.review_assignments(term_id);
CREATE INDEX IF NOT EXISTS idx_assignments_reviewer ON public.review_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status   ON public.review_assignments(status);

-- ============================================================
-- SUGGESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suggestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    UUID REFERENCES public.review_assignments(id),
  term_id          UUID REFERENCES public.taxonomy_terms(id),
  author_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggestion_type  TEXT NOT NULL
                     CHECK (suggestion_type IN ('field_edit', 'new_term', 'hierarchy_change')),
  field_name       TEXT,
  original_value   TEXT,
  proposed_value   TEXT,
  proposed_term    JSONB,
  rationale        TEXT,
  confidence       SMALLINT CHECK (confidence BETWEEN 1 AND 5),
  is_major_change  BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
  admin_note       TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  points_awarded   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_term   ON public.suggestions(term_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_author ON public.suggestions(author_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions(status);

-- ============================================================
-- POINTS LEDGER (immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  source_type TEXT,
  source_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_user ON public.points_transactions(user_id);

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT NOT NULL DEFAULT 'star',
  category      TEXT NOT NULL DEFAULT 'milestone'
                  CHECK (category IN ('milestone', 'streak', 'quality', 'speed', 'special')),
  points_value  INTEGER NOT NULL DEFAULT 0,
  requirement   JSONB NOT NULL DEFAULT '{}',
  is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES public.badge_definitions(id),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  body     TEXT,
  type     TEXT,
  payload  JSONB DEFAULT '{}',
  read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- ============================================================
-- APP SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('review_window_days',    '"14"'),
  ('max_reviewers_per_term','"2"'),
  ('points_config', '{
    "review_complete": 10,
    "suggestion_submitted": 5,
    "suggestion_accepted": 20,
    "major_suggestion_accepted": 40,
    "new_term_submitted": 15,
    "new_term_accepted": 50,
    "streak_daily": 3,
    "first_review_bonus": 15,
    "all_assigned_bonus": 25
  }'),
  ('reward_config', '{
    "first_place_prize": "Free 1-year subscription",
    "prize_tool": "TBD",
    "cycle_active": true
  }')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- LEADERBOARD (materialized view)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard AS
SELECT
  p.id,
  p.pseudonym,
  p.avatar_seed,
  p.total_points,
  p.current_streak,
  COUNT(DISTINCT ra.id) FILTER (WHERE ra.status = 'completed') AS reviews_done,
  COUNT(DISTINCT s.id)  FILTER (WHERE s.status IN ('submitted', 'accepted', 'rejected')) AS suggestions_made,
  COUNT(DISTINCT s.id)  FILTER (WHERE s.status = 'accepted') AS suggestions_accepted,
  COUNT(DISTINCT ub.id) AS badges_earned,
  RANK() OVER (ORDER BY p.total_points DESC) AS rank
FROM public.profiles p
LEFT JOIN public.review_assignments ra ON ra.reviewer_id = p.id
LEFT JOIN public.suggestions s         ON s.author_id = p.id
LEFT JOIN public.user_badges ub        ON ub.user_id = p.id
WHERE p.is_active = TRUE AND p.is_admin = FALSE
GROUP BY p.id, p.pseudonym, p.avatar_seed, p.total_points, p.current_streak;

CREATE UNIQUE INDEX ON public.leaderboard(id);
