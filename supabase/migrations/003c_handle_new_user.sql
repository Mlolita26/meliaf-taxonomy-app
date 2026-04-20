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
