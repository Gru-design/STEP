-- Create avatars storage bucket
-- Bucket is public for img tag access (industry standard: Slack, GitHub, Notion)
-- Tenant isolation is enforced at two levels:
--   1. Storage path: {tenant_id}/{user_id}/avatar.ext
--   2. DB-level: avatar_url is only exposed through RLS-protected users table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatar under their tenant's folder
-- Path must match: {own_tenant_id}/{own_user_id}/filename
CREATE POLICY "users_upload_own_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow authenticated users to update (overwrite) their own avatar
CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "users_delete_own_avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Read access: authenticated users within same tenant only
-- (public bucket allows img tag access; this policy adds defense-in-depth)
CREATE POLICY "tenant_read_avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
  );
