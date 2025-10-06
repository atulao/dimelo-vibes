-- Add expected speakers to sessions
ALTER TABLE sessions 
ADD COLUMN expected_speakers text[] DEFAULT '{}',
ADD COLUMN current_speaker text;

-- Create index for speaker queries
CREATE INDEX idx_transcript_segments_speaker ON transcript_segments(speaker_name);

-- Add comment
COMMENT ON COLUMN sessions.expected_speakers IS 'List of expected speaker names for the session';
COMMENT ON COLUMN sessions.current_speaker IS 'Currently active speaker during live recording';