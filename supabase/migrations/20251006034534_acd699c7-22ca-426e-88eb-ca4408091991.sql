-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'attendee');

-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('draft', 'scheduled', 'live', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role, organization_id)
);

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create conferences table
CREATE TABLE public.conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  speaker_name TEXT,
  speaker_bio TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status session_status DEFAULT 'draft',
  qr_code_url TEXT,
  is_recording BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transcript_segments table
CREATE TABLE public.transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  speaker_label TEXT,
  confidence DECIMAL(5,4),
  start_time DECIMAL(10,3),
  end_time DECIMAL(10,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ai_insights table
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create questions table for Q&A
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to check organization access
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND (ur.organization_id = _org_id OR ur.role = 'admin')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for organizations
CREATE POLICY "Anyone can view active organizations"
  ON public.organizations FOR SELECT
  USING (true);

CREATE POLICY "Owners and admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for conferences
CREATE POLICY "Anyone can view active conferences"
  ON public.conferences FOR SELECT
  USING (is_active = true);

CREATE POLICY "Organization members can manage conferences"
  ON public.conferences FOR ALL
  USING (public.has_org_access(auth.uid(), organization_id));

-- RLS Policies for tracks
CREATE POLICY "Anyone can view tracks"
  ON public.tracks FOR SELECT
  USING (true);

CREATE POLICY "Organization members can manage tracks"
  ON public.tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conferences c
      WHERE c.id = tracks.conference_id
      AND public.has_org_access(auth.uid(), c.organization_id)
    )
  );

-- RLS Policies for sessions
CREATE POLICY "Anyone can view sessions"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Organization members can manage sessions"
  ON public.sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.conferences c ON c.id = t.conference_id
      WHERE t.id = sessions.track_id
      AND public.has_org_access(auth.uid(), c.organization_id)
    )
  );

-- RLS Policies for transcript_segments
CREATE POLICY "Anyone can view transcript segments"
  ON public.transcript_segments FOR SELECT
  USING (true);

CREATE POLICY "System can insert transcript segments"
  ON public.transcript_segments FOR INSERT
  WITH CHECK (true);

-- RLS Policies for ai_insights
CREATE POLICY "Anyone can view AI insights"
  ON public.ai_insights FOR SELECT
  USING (true);

CREATE POLICY "System can insert AI insights"
  ON public.ai_insights FOR INSERT
  WITH CHECK (true);

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions"
  ON public.questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can ask questions"
  ON public.questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organization members can answer questions"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.tracks t ON t.id = s.track_id
      JOIN public.conferences c ON c.id = t.conference_id
      WHERE s.id = questions.session_id
      AND public.has_org_access(auth.uid(), c.organization_id)
    )
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conferences_updated_at
  BEFORE UPDATE ON public.conferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live transcription
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcript_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;