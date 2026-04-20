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

GRANT EXECUTE ON FUNCTION public.get_next_term_for_reviewer(UUID) TO authenticated;
