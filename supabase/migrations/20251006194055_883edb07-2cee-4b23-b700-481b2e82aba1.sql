-- Add incremental tracking to ai_insights table
ALTER TABLE public.ai_insights 
ADD COLUMN IF NOT EXISTS last_processed_word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transcript_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'in_progress';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_insights_session_version 
ON public.ai_insights(session_id, transcript_version DESC);

-- Add updated_at column if not exists
ALTER TABLE public.ai_insights 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_insights_updated_at ON public.ai_insights;
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_insights_timestamp();