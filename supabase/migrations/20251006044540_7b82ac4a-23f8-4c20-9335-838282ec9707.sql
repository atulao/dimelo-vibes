-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', false);

-- Allow authenticated users to upload their session recordings
CREATE POLICY "Users can upload session recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view recordings they have access to
CREATE POLICY "Users can view session recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'session-recordings');

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete own recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add recording_url and is_public columns to sessions table
ALTER TABLE public.sessions
ADD COLUMN recording_url text,
ADD COLUMN is_public boolean DEFAULT false;

-- Update the updated_at timestamp
CREATE TRIGGER update_sessions_recording_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
WHEN (OLD.recording_url IS DISTINCT FROM NEW.recording_url OR OLD.is_public IS DISTINCT FROM NEW.is_public)
EXECUTE FUNCTION public.update_updated_at_column();