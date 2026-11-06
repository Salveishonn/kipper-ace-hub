-- Push notifications for the admin team (PWA de administración).
-- Each admin chooses which team events reach their devices; all on by default.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS admin_push_cases boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_push_applications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_push_forum boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.admin_push_cases IS
  'Admins: push for new consultas and new producer messages.';
COMMENT ON COLUMN public.notification_preferences.admin_push_applications IS
  'Admins: push for new PAS applications.';
COMMENT ON COLUMN public.notification_preferences.admin_push_forum IS
  'Admins: push for new forum posts and comments.';
