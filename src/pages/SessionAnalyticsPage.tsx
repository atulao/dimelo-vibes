import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SessionAnalytics } from "@/components/session/SessionAnalytics";
import { Navigation } from "@/components/Navigation";

const SessionAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch session
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          tracks (
            name,
            conference_id,
            conferences (
              name,
              organization_id
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Check if user is the speaker
      const isSpeaker = data.speaker_email === user.email;

      // Check if user has org access (admin or organizer)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", user.id);

      const isAdmin = roleData?.some(r => r.role === "admin");
      const isOrganizerOfConference = roleData?.some(
        r => r.role === "organizer" && 
        r.organization_id === data.tracks.conferences.organization_id
      );

      if (!isSpeaker && !isAdmin && !isOrganizerOfConference) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view these analytics.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setCanView(true);
      setSession(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!canView || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/speaker/sessions")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Sessions
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
          <p className="text-muted-foreground">
            {session.tracks?.conferences?.name} • {session.tracks?.name}
          </p>
          {session.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {session.description}
            </p>
          )}
        </div>

        <div className="max-w-2xl">
          <SessionAnalytics sessionId={id!} />
        </div>
      </div>
    </div>
  );
};

export default SessionAnalyticsPage;
