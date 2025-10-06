-- Create the transcription_provider enum type
CREATE TYPE transcription_provider AS ENUM ('browser', 'whisper');

-- Add transcription_provider column to sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'transcription_provider'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN transcription_provider transcription_provider DEFAULT 'browser'::transcription_provider;
  END IF;
END $$;

-- Add transcription_settings column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'transcription_settings'
  ) THEN
    ALTER TABLE sessions 
    ADD COLUMN transcription_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;