-- Create session_attendees table
CREATE TABLE public.session_attendees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.session_attendees ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view attendees
CREATE POLICY "Anyone can view attendees"
ON public.session_attendees
FOR SELECT
USING (true);

-- Authenticated users can join sessions
CREATE POLICY "Users can join sessions"
ON public.session_attendees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own attendance (for leaving)
CREATE POLICY "Users can update own attendance"
ON public.session_attendees
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for live attendee tracking
ALTER TABLE public.session_attendees REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendees;

-- Create index for faster queries
CREATE INDEX idx_session_attendees_session_id ON public.session_attendees(session_id);
CREATE INDEX idx_session_attendees_active ON public.session_attendees(session_id, left_at) WHERE left_at IS NULL;