-- Create saved_searches table
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  email_alerts boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved searches"
ON public.saved_searches
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Add tsvector columns for full-text search
ALTER TABLE public.sessions
ADD COLUMN search_vector tsvector;

ALTER TABLE public.transcript_segments
ADD COLUMN search_vector tsvector;

ALTER TABLE public.conferences
ADD COLUMN search_vector tsvector;

ALTER TABLE public.ai_insights
ADD COLUMN search_vector tsvector;

-- Create function to update sessions search vector
CREATE OR REPLACE FUNCTION public.update_sessions_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.speaker_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.speaker_bio, '')), 'C');
  RETURN NEW;
END;
$$;

-- Create function to update transcript segments search vector
CREATE OR REPLACE FUNCTION public.update_transcript_segments_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.speaker_label, '')), 'B');
  RETURN NEW;
END;
$$;

-- Create function to update conferences search vector
CREATE OR REPLACE FUNCTION public.update_conferences_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$;

-- Create function to update AI insights search vector
CREATE OR REPLACE FUNCTION public.update_ai_insights_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.insight_type, '')), 'B');
  RETURN NEW;
END;
$$;

-- Create triggers for automatic search vector updates
CREATE TRIGGER sessions_search_vector_update
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_sessions_search_vector();

CREATE TRIGGER transcript_segments_search_vector_update
BEFORE INSERT OR UPDATE ON public.transcript_segments
FOR EACH ROW
EXECUTE FUNCTION public.update_transcript_segments_search_vector();

CREATE TRIGGER conferences_search_vector_update
BEFORE INSERT OR UPDATE ON public.conferences
FOR EACH ROW
EXECUTE FUNCTION public.update_conferences_search_vector();

CREATE TRIGGER ai_insights_search_vector_update
BEFORE INSERT OR UPDATE ON public.ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_insights_search_vector();

-- Create GIN indexes for fast full-text search
CREATE INDEX sessions_search_idx ON public.sessions USING GIN(search_vector);
CREATE INDEX transcript_segments_search_idx ON public.transcript_segments USING GIN(search_vector);
CREATE INDEX conferences_search_idx ON public.conferences USING GIN(search_vector);
CREATE INDEX ai_insights_search_idx ON public.ai_insights USING GIN(search_vector);

-- Update existing records to populate search vectors
UPDATE public.sessions SET updated_at = updated_at;
UPDATE public.transcript_segments SET created_at = created_at;
UPDATE public.conferences SET updated_at = updated_at;
UPDATE public.ai_insights SET created_at = created_at;

-- Create trigger for saved_searches updated_at
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();