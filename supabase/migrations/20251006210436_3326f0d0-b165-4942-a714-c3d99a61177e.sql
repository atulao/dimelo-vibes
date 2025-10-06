-- Add timestamp reference to ai_insights for citation linking
ALTER TABLE ai_insights 
ADD COLUMN timestamp_seconds numeric,
ADD COLUMN transcript_segment_id uuid REFERENCES transcript_segments(id);

-- Add index for faster lookups
CREATE INDEX idx_ai_insights_timestamp ON ai_insights(timestamp_seconds);
CREATE INDEX idx_ai_insights_segment ON ai_insights(transcript_segment_id);

-- Add comment explaining the columns
COMMENT ON COLUMN ai_insights.timestamp_seconds IS 'Reference timestamp in seconds for citation linking to transcript';
COMMENT ON COLUMN ai_insights.transcript_segment_id IS 'Optional direct reference to specific transcript segment';