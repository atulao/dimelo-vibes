-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'session_starting',
  'question_asked', 
  'session_ended',
  'new_insight',
  'question_upvoted'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to notify attendees when session starts
CREATE OR REPLACE FUNCTION notify_session_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'live'
  IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
    -- Get session details
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT 
      sa.user_id,
      'session_starting'::notification_type,
      'Session Starting: ' || NEW.title,
      'Your session "' || NEW.title || '" is now live!',
      '/session/' || NEW.id || '/live'
    FROM public.session_attendees sa
    WHERE sa.session_id = NEW.id
      AND sa.left_at IS NULL;
  END IF;
  
  -- Notify when session ends
  IF NEW.status = 'completed' AND OLD.status = 'live' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT 
      sa.user_id,
      'session_ended'::notification_type,
      'Session Ended: ' || NEW.title,
      'The session "' || NEW.title || '" has ended. View analytics.',
      '/session/' || NEW.id
    FROM public.session_attendees sa
    WHERE sa.session_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for session status changes
CREATE TRIGGER notify_on_session_status_change
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_start();

-- Function to notify when question is asked
CREATE OR REPLACE FUNCTION notify_question_asked()
RETURNS TRIGGER AS $$
DECLARE
  v_session_title text;
  v_speaker_email text;
  v_speaker_user_id uuid;
BEGIN
  -- Get session and speaker info
  SELECT s.title, s.speaker_email
  INTO v_session_title, v_speaker_email
  FROM public.sessions s
  WHERE s.id = NEW.session_id;
  
  -- Get speaker's user_id from profiles
  SELECT id INTO v_speaker_user_id
  FROM public.profiles
  WHERE email = v_speaker_email
  LIMIT 1;
  
  -- Notify speaker if found
  IF v_speaker_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_speaker_user_id,
      'question_asked'::notification_type,
      'New Question: ' || v_session_title,
      'Someone asked: "' || LEFT(NEW.question, 100) || '"',
      '/session/' || NEW.session_id || '/live'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new questions
CREATE TRIGGER notify_on_new_question
  AFTER INSERT ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_question_asked();

-- Function to notify when question gets upvoted
CREATE OR REPLACE FUNCTION notify_question_upvoted()
RETURNS TRIGGER AS $$
DECLARE
  v_session_title text;
  v_speaker_email text;
  v_speaker_user_id uuid;
  v_question_text text;
BEGIN
  -- Only notify when upvotes reach 5
  IF NEW.upvotes = 5 AND (OLD.upvotes < 5 OR OLD.upvotes IS NULL) THEN
    -- Get session and speaker info
    SELECT s.title, s.speaker_email
    INTO v_session_title, v_speaker_email
    FROM public.sessions s
    WHERE s.id = NEW.session_id;
    
    -- Get speaker's user_id
    SELECT id INTO v_speaker_user_id
    FROM public.profiles
    WHERE email = v_speaker_email
    LIMIT 1;
    
    -- Notify speaker if found
    IF v_speaker_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        v_speaker_user_id,
        'question_upvoted'::notification_type,
        'Popular Question: ' || v_session_title,
        'A question has received 5+ upvotes: "' || LEFT(NEW.question, 80) || '"',
        '/session/' || NEW.session_id || '/live'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for question upvotes
CREATE TRIGGER notify_on_question_upvote
  AFTER UPDATE OF upvotes ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION notify_question_upvoted();

-- Function to notify when AI insights are generated
CREATE OR REPLACE FUNCTION notify_new_insights()
RETURNS TRIGGER AS $$
DECLARE
  v_session_title text;
BEGIN
  -- Get session title
  SELECT s.title INTO v_session_title
  FROM public.sessions s
  WHERE s.id = NEW.session_id;
  
  -- Notify all active attendees
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT 
    sa.user_id,
    'new_insight'::notification_type,
    'New AI Insights: ' || v_session_title,
    'AI-generated insights are now available for this session.',
    '/session/' || NEW.session_id || '/live'
  FROM public.session_attendees sa
  WHERE sa.session_id = NEW.session_id
    AND sa.left_at IS NULL;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new AI insights (only for summary type)
CREATE TRIGGER notify_on_new_insight
  AFTER INSERT ON public.ai_insights
  FOR EACH ROW
  WHEN (NEW.insight_type = 'summary')
  EXECUTE FUNCTION notify_new_insights();