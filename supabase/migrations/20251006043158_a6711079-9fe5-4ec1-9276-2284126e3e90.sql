-- Ensure REPLICA IDENTITY is set for realtime updates
ALTER TABLE public.transcript_segments REPLICA IDENTITY FULL;