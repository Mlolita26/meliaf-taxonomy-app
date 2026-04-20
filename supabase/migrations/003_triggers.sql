-- ============================================================
-- TRIGGER: enforce max 2 reviewers per term
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_max_reviewers()
RETURNS TRIGGER AS $func$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.review_assignments
  WHERE term_id = NEW.term_id
    AND status != 'skipped'
    AND id IS DISTINCT FROM NEW.id;

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'Term % already has 2 active reviewers', NEW.term_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_max_reviewers ON public.review_assignments;
CREATE TRIGGER enforce_max_reviewers
  BEFORE INSERT ON public.review_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_max_reviewers();

-- ============================================================
-- TRIGGER: sync total_points from ledger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_total_points()
RETURNS TRIGGER AS $func$
BEGIN
  UPDATE public.profiles
  SET total_points = total_points + NEW.points,
      updated_at   = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_total_points ON public.points_transactions;
CREATE TRIGGER sync_total_points
  AFTER INSERT ON public.points_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_total_points();

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.profiles (id, pseudonym, avatar_seed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pseudonym', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_seed', NEW.id::text)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_terms_updated_at ON public.taxonomy_terms;
CREATE TRIGGER set_terms_updated_at
  BEFORE UPDATE ON public.taxonomy_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_suggestions_updated_at ON public.suggestions;
CREATE TRIGGER set_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FUNCTION: update streak on login (called via RPC from app)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_daily_login(p_user_id UUID)
RETURNS JSONB AS $func$
DECLARE
  v_last_active  DATE;
  v_cur_streak   INTEGER;
  v_today        DATE;
  v_streak_pts   INTEGER;
  v_new_streak   INTEGER;
BEGIN
  v_today      := CURRENT_DATE;
  v_streak_pts := 0;

  v_last_active := (SELECT last_active_date FROM public.profiles WHERE id = p_user_id);
  v_cur_streak  := (SELECT current_streak   FROM public.profiles WHERE id = p_user_id);

  IF v_last_active = v_today THEN
    RETURN jsonb_build_object('streak', v_cur_streak, 'points_earned', 0);
  END IF;

  IF v_last_active = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_cur_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE public.profiles SET
    last_active_date = v_today,
    current_streak   = v_new_streak,
    longest_streak   = GREATEST(longest_streak, v_new_streak),
    updated_at       = NOW()
  WHERE id = p_user_id;

  IF v_new_streak > 1 THEN
    v_streak_pts := 3;
    INSERT INTO public.points_transactions (user_id, points, reason, source_type)
    VALUES (p_user_id, v_streak_pts, 'Daily streak bonus (day ' || v_new_streak || ')', 'streak');
  END IF;

  RETURN jsonb_build_object('streak', v_new_streak, 'points_earned', v_streak_pts);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get next unassigned term for a reviewer
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_term_for_reviewer(p_user_id UUID)
RETURNS UUID AS $func$
DECLARE
  v_term_id UUID;
BEGIN
  v_term_id := (
    SELECT t.id
    FROM public.taxonomy_terms t
  WHERE t.is_active = TRUE
    AND t.is_proposed = FALSE
    AND (
      SELECT COUNT(*) FROM public.review_assignments ra
      WHERE ra.term_id = t.id AND ra.status != 'skipped'
    ) < 2
    AND NOT EXISTS (
      SELECT 1 FROM public.review_assignments ra
      WHERE ra.term_id = t.id AND ra.reviewer_id = p_user_id
    )
      AND (t.proposed_by IS NULL OR t.proposed_by != p_user_id)
    ORDER BY
      (SELECT COUNT(*) FROM public.review_assignments ra WHERE ra.term_id = t.id AND ra.status != 'skipped') ASC,
      t.term_code ASC
    LIMIT 1
  );

  RETURN v_term_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.record_daily_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_term_for_reviewer(UUID) TO authenticated;
