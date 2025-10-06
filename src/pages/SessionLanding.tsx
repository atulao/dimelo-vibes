import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, ArrowRight } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";

const SessionLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && id) {
      fetchSession();
    }
  }, [user, id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchSession = async () => {
    try {
      setLoading(true);
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
        .eq("id", id)
        .single();

      if (error) throw error;
      setSession(data);
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

  const getSessionStatus = () => {
    if (!session?.start_time || !session?.end_time) return "upcoming";

    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);

    if (isBefore(now, start)) return "upcoming";
    if (isAfter(now, end)) return "ended";
    return "live";
  };

  const handleJoinSession = () => {
    const status = getSessionStatus();
    if (status !== "live") {
      toast({
        title: "Session Not Live",
        description: "This session is not currently live.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/session/${id}/live`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const status = getSessionStatus();
  const statusColors = {
    upcoming: "bg-blue-500",
    live: "bg-green-500 animate-pulse",
    ended: "bg-gray-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={statusColors[status]}>
                    {status === "live" ? "🔴 LIVE NOW" : status.toUpperCase()}
                  </Badge>
                  {session.tracks?.conferences && (
                    <span className="text-sm text-muted-foreground">
                      {session.tracks.conferences.name}
                    </span>
                  )}
                </div>
                <CardTitle className="text-3xl mb-2">{session.title}</CardTitle>
                {session.tracks && (
                  <CardDescription className="text-base">
                    Track: {session.tracks.name}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.description && (
              <p className="text-lg leading-relaxed">{session.description}</p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {session.speaker_name && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">{session.speaker_name}</p>
                    {session.speaker_bio && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {session.speaker_bio}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {session.start_time && session.end_time && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(session.start_time), "MMM d, h:mm a")} -{" "}
                      {format(new Date(session.end_time), "h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {session.tracks?.conferences?.location && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {session.tracks.conferences.location}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {status === "live" && (
              <Button
                size="lg"
                className="w-full text-lg h-14"
                onClick={handleJoinSession}
              >
                Join Live Session
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}

            {status === "upcoming" && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  This session will be available when it goes live
                </p>
              </div>
            )}

            {status === "ended" && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">This session has ended</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionLanding;
