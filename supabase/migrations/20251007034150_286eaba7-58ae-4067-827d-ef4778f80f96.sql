-- Enable RLS policies for session-recordings bucket
-- Allow authenticated users to upload their recordings
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-recordings'
);

-- Allow public read access to recordings (so shared sessions work)
CREATE POLICY "Public can view recordings"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'session-recordings'
);

-- Allow authenticated users to update their own recordings
CREATE POLICY "Users can update their recordings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'session-recordings'
);

-- Allow authenticated users to delete their recordings
CREATE POLICY "Users can delete recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-recordings'
);