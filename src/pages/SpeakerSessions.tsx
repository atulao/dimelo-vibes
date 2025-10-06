import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Play, BarChart } from "lucide-react";

interface Session {
  id: string;
  title: string;
  description: string;
  speaker_name: string;
  speaker_email: string;
  start_time: string;
  end_time: string;
  status: string;
  tracks: {
    name: string;
    conferences: {
      name: string;
      location: string;
    };
  };
}

const SpeakerSessions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetchSessions();
  }, []);

  const checkAuthAndFetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          tracks (
            name,
            conferences (
              name,
              location
            )
          )
        `)
        .eq("speaker_email", user.email)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ 
          status: "live",
          is_recording: true 
        })
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: "Session Started",
        description: "Your session is now live!",
      });

      navigate(`/session/${sessionId}/live`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      scheduled: { variant: "default", label: "Scheduled" },
      live: { variant: "destructive", label: "🔴 Live" },
      completed: { variant: "secondary", label: "Completed" },
    };

    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your sessions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Sessions</h1>
          <p className="text-muted-foreground">
            Manage and present your conference sessions
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No sessions found for {userEmail}
              </p>
              <p className="text-sm text-muted-foreground">
                Sessions will appear here when you're added as a speaker to a conference session.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <Card key={session.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{session.title}</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription>
                    {session.tracks?.conferences?.name} • {session.tracks?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {session.start_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(session.start_time).toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    {session.start_time && session.end_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(session.start_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(session.end_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}

                    {session.tracks?.conferences?.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{session.tracks.conferences.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    {session.status === "scheduled" && (
                      <Button
                        onClick={() => handleGoLive(session.id)}
                        className="flex-1"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Go Live
                      </Button>
                    )}

                    {session.status === "live" && (
                      <Button
                        onClick={() => navigate(`/session/${session.id}/live`)}
                        className="flex-1"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Join Live Session
                      </Button>
                    )}

                    {session.status === "completed" && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/session/${session.id}/analytics`)}
                        className="flex-1"
                      >
                        <BarChart className="mr-2 h-4 w-4" />
                        View Analytics
                      </Button>
                    )}

                    {session.status !== "live" && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/session/${session.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerSessions;
