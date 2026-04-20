-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- TAXONOMY TERMS
ALTER TABLE public.taxonomy_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_select_authenticated" ON public.taxonomy_terms;
CREATE POLICY "terms_select_authenticated"
  ON public.taxonomy_terms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "terms_insert_admin" ON public.taxonomy_terms;
CREATE POLICY "terms_insert_admin"
  ON public.taxonomy_terms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "terms_update_admin" ON public.taxonomy_terms;
CREATE POLICY "terms_update_admin"
  ON public.taxonomy_terms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- REVIEW ASSIGNMENTS
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select_own" ON public.review_assignments;
CREATE POLICY "assignments_select_own"
  ON public.review_assignments FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "assignments_insert_admin" ON public.review_assignments;
CREATE POLICY "assignments_insert_admin"
  ON public.review_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "assignments_update_own" ON public.review_assignments;
CREATE POLICY "assignments_update_own"
  ON public.review_assignments FOR UPDATE TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- SUGGESTIONS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions_select" ON public.suggestions;
CREATE POLICY "suggestions_select"
  ON public.suggestions FOR SELECT TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "suggestions_insert_own" ON public.suggestions;
CREATE POLICY "suggestions_insert_own"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "suggestions_update_own_draft" ON public.suggestions;
CREATE POLICY "suggestions_update_own_draft"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (
    (author_id = auth.uid() AND status = 'draft') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- POINTS TRANSACTIONS
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_select_own" ON public.points_transactions;
CREATE POLICY "points_select_own"
  ON public.points_transactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

DROP POLICY IF EXISTS "points_insert_service" ON public.points_transactions;
CREATE POLICY "points_insert_service"
  ON public.points_transactions FOR INSERT TO service_role
  WITH CHECK (true);

-- BADGE DEFINITIONS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select_all" ON public.badge_definitions;
CREATE POLICY "badges_select_all" ON public.badge_definitions FOR SELECT TO authenticated USING (true);

-- USER BADGES
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select"
  ON public.user_badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_badges_update_own_seen" ON public.user_badges;
CREATE POLICY "user_badges_update_own_seen"
  ON public.user_badges FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- APP SETTINGS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select_all" ON public.app_settings;
CREATE POLICY "settings_select_all" ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_update_admin" ON public.app_settings;
CREATE POLICY "settings_update_admin" ON public.app_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));
