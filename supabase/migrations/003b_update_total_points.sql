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
