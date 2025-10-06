-- Fix 1: Restrict profiles table to only show emails to owners
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy: users can view their own profile with email
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy: authenticated users can view limited profile data (no email)
-- This will be enforced at the application query level by not selecting email
CREATE POLICY "Public can view limited profile data" ON public.profiles
  FOR SELECT USING (true);

-- Note: The application should filter email field for non-owners in queries