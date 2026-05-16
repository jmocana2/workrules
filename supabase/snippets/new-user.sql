CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
      INSERT INTO public.user_profiles (id)
      VALUES (NEW.id)
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
  END;
  $$;

  COMMENT ON FUNCTION handle_new_user IS 'Crea automáticamente una fila en user_profiles cuando se registra un nuevo usuario en auth.users';

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();

  -- Backfill: crea perfiles para usuarios existentes que aún no lo tengan
  INSERT INTO public.user_profiles (id)
  SELECT id FROM auth.users
  ON CONFLICT (id) DO NOTHING;