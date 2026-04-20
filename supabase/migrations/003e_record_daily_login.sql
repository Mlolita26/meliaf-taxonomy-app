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

GRANT EXECUTE ON FUNCTION public.record_daily_login(UUID) TO authenticated;
