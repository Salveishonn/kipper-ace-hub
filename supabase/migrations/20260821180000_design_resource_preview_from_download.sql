-- Existing graphic templates were uploaded as download files only (preview_path NULL),
-- so productores saw empty placeholders. Copy image downloads into preview_path.
UPDATE public.design_resources
SET preview_path = download_path
WHERE preview_path IS NULL
  AND download_path IS NOT NULL
  AND download_path ~* '\.(jpe?g|png|gif|webp|svg)$';
