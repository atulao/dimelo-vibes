-- Add transcription provider settings to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS transcription_provider TEXT DEFAULT 'browser' CHECK (transcription_provider IN ('browser', 'assemblyai', 'deepgram')),
ADD COLUMN IF NOT EXISTS transcription_settings JSONB DEFAULT '{}'::jsonb;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_transcription_provider 
ON public.sessions(transcription_provider);

-- Add speaker identification to transcript_segments
ALTER TABLE public.transcript_segments
ADD COLUMN IF NOT EXISTS speaker_id TEXT,
ADD COLUMN IF NOT EXISTS speaker_name TEXT;

-- Create table for recording settings
CREATE TABLE IF NOT EXISTS public.recording_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_device_id TEXT,
  audio_quality TEXT DEFAULT 'standard' CHECK (audio_quality IN ('standard', 'high', 'stereo')),
  auto_speaker_detection BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.recording_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for recording_settings
CREATE POLICY "Users can manage own recording settings"
ON public.recording_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recording_settings_updated_at
  BEFORE UPDATE ON public.recording_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();