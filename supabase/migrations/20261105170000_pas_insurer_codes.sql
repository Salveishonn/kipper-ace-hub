-- Solicitud PAS: "¿Tenés código de productor en alguna compañía?" y, si sí, cuál y qué número.

ALTER TABLE public.producer_applications
  ADD COLUMN IF NOT EXISTS has_insurer_code boolean,
  ADD COLUMN IF NOT EXISTS insurer_codes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.producer_applications
  DROP CONSTRAINT IF EXISTS producer_applications_insurer_codes_shape;
ALTER TABLE public.producer_applications
  ADD CONSTRAINT producer_applications_insurer_codes_shape
  CHECK (
    jsonb_typeof(insurer_codes) = 'array'
    AND jsonb_array_length(insurer_codes) <= 10
    AND length(insurer_codes::text) <= 4000
  );

-- Keeps only well-formed {company, code} pairs from untrusted signup metadata.
CREATE OR REPLACE FUNCTION public.sanitize_insurer_codes(p jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
             'company', left(btrim(e->>'company'), 100),
             'code', left(btrim(COALESCE(e->>'code', '')), 50)
           ) AS item
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p) = 'array' THEN p ELSE '[]'::jsonb END) AS e
    WHERE jsonb_typeof(e) = 'object'
      AND NULLIF(btrim(e->>'company'), '') IS NOT NULL
    LIMIT 10
  ) s
$$;

REVOKE ALL ON FUNCTION public.sanitize_insurer_codes(jsonb) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.provision_pas_applicant_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  is_applicant boolean := COALESCE((meta->>'pas_applicant')::boolean, false);
  app_full_name text;
  app_phone text;
  app_city text;
  app_province text;
  app_matricula text;
  app_years integer;
  app_companies text;
  app_message text;
  app_has_code boolean;
  app_codes jsonb;
BEGIN
  -- Legacy invite path is handled by link_pas_invite_on_auth_insert.
  IF NEW.invited_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_applicant THEN
    RETURN NEW;
  END IF;

  app_full_name := NULLIF(btrim(COALESCE(meta->>'full_name', '')), '');
  app_phone := NULLIF(btrim(COALESCE(meta->>'phone', '')), '');
  app_city := NULLIF(btrim(COALESCE(meta->>'city', '')), '');
  app_province := NULLIF(btrim(COALESCE(meta->>'province', '')), '');
  app_matricula := NULLIF(btrim(COALESCE(meta->>'matricula_ssn', '')), '');
  app_companies := NULLIF(btrim(COALESCE(meta->>'current_companies', '')), '');
  app_message := NULLIF(btrim(COALESCE(meta->>'message', '')), '');
  app_has_code := CASE meta->>'has_insurer_code' WHEN 'true' THEN true WHEN 'false' THEN false ELSE NULL END;
  app_codes := CASE WHEN app_has_code THEN public.sanitize_insurer_codes(meta->'insurer_codes') ELSE '[]'::jsonb END;

  BEGIN
    IF meta ? 'years_experience' AND NULLIF(meta->>'years_experience', '') IS NOT NULL THEN
      app_years := (meta->>'years_experience')::integer;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    app_years := NULL;
  END;

  INSERT INTO public.profiles (user_id, email, full_name, phone, city, province, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    app_full_name,
    app_phone,
    app_city,
    app_province,
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      city = COALESCE(EXCLUDED.city, public.profiles.city),
      province = COALESCE(EXCLUDED.province, public.profiles.province),
      account_status = CASE
        WHEN public.profiles.account_status = 'active' THEN public.profiles.account_status
        ELSE 'pending'
      END,
      updated_at = now();

  IF NOT EXISTS (
    SELECT 1
    FROM public.producer_applications
    WHERE user_id = NEW.id
       OR lower(email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.producer_applications (
      full_name,
      email,
      phone,
      matricula_ssn,
      city,
      province,
      years_experience,
      current_companies,
      message,
      has_insurer_code,
      insurer_codes,
      status,
      user_id
    )
    VALUES (
      COALESCE(app_full_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      app_phone,
      app_matricula,
      app_city,
      app_province,
      app_years,
      app_companies,
      app_message,
      app_has_code,
      app_codes,
      'pending',
      NEW.id
    );
  ELSE
    -- Link an existing open application that was created without Auth (legacy).
    UPDATE public.producer_applications
    SET user_id = NEW.id,
        status = CASE
          WHEN status IN ('nuevo', 'en_revision', 'aprobado', 'pending') THEN 'pending'
          ELSE status
        END,
        updated_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND user_id IS NULL
      AND status IN ('nuevo', 'en_revision', 'aprobado', 'pending');
  END IF;

  -- Never grant productor here.
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_pas_applicant_on_signup() FROM PUBLIC, anon, authenticated;

-- The team email now says whether the applicant already has a company code.
CREATE OR REPLACE FUNCTION public.tg_enqueue_pas_application_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin-created producers are inserted as 'activo' and need no review.
  IF NEW.status NOT IN ('pending', 'nuevo') THEN
    RETURN NEW;
  END IF;

  -- Runs inside the auth signup transaction: a notification problem must not block signup.
  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'pas.application.created',
      NEW.id::text,
      jsonb_build_object(
        'application_id', NEW.id,
        'producer_name', NEW.full_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'matricula_ssn', NEW.matricula_ssn,
        'location', NULLIF(concat_ws(', ', NEW.city, NEW.province), ''),
        'has_insurer_code', NEW.has_insurer_code,
        'insurer_codes', COALESCE(NEW.insurer_codes, '[]'::jsonb),
        'created_at', NEW.created_at,
        'preview', left(regexp_replace(COALESCE(NEW.message, ''), '\s+', ' ', 'g'), 180)
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;

    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pas application notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_enqueue_pas_application_email() FROM PUBLIC, anon, authenticated;
