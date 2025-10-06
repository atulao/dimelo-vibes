-- Add confidence score to ai_insights
ALTER TABLE ai_insights 
ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium' CHECK (confidence_score IN ('low', 'medium', 'high'));

-- Create insight_feedback table for tracking user feedback
CREATE TABLE IF NOT EXISTS insight_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('incorrect', 'helpful', 'not_helpful')),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(insight_id, user_id)
);

-- Enable RLS on insight_feedback
ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view all feedback
CREATE POLICY "Users can view feedback"
  ON insight_feedback FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON insight_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON insight_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);