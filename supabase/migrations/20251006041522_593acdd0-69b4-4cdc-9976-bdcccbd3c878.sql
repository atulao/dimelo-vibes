-- Add speaker_email column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS speaker_email text;