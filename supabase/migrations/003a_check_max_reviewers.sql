CREATE OR REPLACE FUNCTION public.check_max_reviewers()
RETURNS TRIGGER AS $func$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.review_assignments
    WHERE term_id = NEW.term_id
      AND status != 'skipped'
      AND id IS DISTINCT FROM NEW.id
  ) >= 2 THEN
    RAISE EXCEPTION 'Term % already has 2 active reviewers', NEW.term_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_max_reviewers ON public.review_assignments;
CREATE TRIGGER enforce_max_reviewers
  BEFORE INSERT ON public.review_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_max_reviewers();
