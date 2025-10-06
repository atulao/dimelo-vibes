-- Add upvotes and is_answered columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_answered boolean DEFAULT false;

-- Update the RLS policy to allow upvoting
CREATE POLICY "Authenticated users can upvote questions"
ON public.questions
FOR UPDATE
USING (auth.uid() IS NOT NULL);