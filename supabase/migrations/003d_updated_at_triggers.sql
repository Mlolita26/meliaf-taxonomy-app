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
