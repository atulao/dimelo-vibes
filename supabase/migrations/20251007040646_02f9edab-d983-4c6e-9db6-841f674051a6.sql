-- Make the session-recordings bucket public so audio files can be played
UPDATE storage.buckets
SET public = true
WHERE id = 'session-recordings';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can view public session recordings" ON storage.objects;

-- Add RLS policies for session recordings storage
-- Allow authenticated users to upload their own recordings
CREATE POLICY "Users can upload their own session recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view recordings for sessions they have access to
CREATE POLICY "Users can view session recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-recordings'
);

-- Allow public access to recordings for public sessions
CREATE POLICY "Public can view public session recordings"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'session-recordings');