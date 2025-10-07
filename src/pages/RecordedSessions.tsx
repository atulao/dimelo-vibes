import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Calendar, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface RecordedSession {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  recording_url: string | null;
  speaker_name: string | null;
  transcript_count?: number;
  question_count?: number;
}

export default function RecordedSessions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<RecordedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecordedSessions();
  }, []);

  const fetchRecordedSessions = async () => {
    try {
      setLoading(true);
      
      // Fetch all sessions that have recordings
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, title, description, created_at, recording_url, speaker_name")
        .not("recording_url", "is", null)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch transcript and question counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const [transcriptResult, questionResult] = await Promise.all([
            supabase
              .from("transcript_segments")
              .select("id", { count: "exact", head: true })
              .eq("session_id", session.id),
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("session_id", session.id),
          ]);

          return {
            ...session,
            transcript_count: transcriptResult.count || 0,
            question_count: questionResult.count || 0,
          };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (error: any) {
      console.error("Error fetching recorded sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load recorded sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/session/${sessionId}/replay`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Recorded Sessions</h1>
            <p className="text-muted-foreground mt-2">
              Browse and interact with your saved session recordings
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No recorded sessions yet.</p>
              <Button onClick={() => navigate("/recording-test")}>
                Start Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{session.title}</CardTitle>
                  {session.speaker_name && (
                    <CardDescription>by {session.speaker_name}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(session.created_at), "MMM d, yyyy")}</span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {session.transcript_count} segments
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {session.question_count} questions
                    </Badge>
                  </div>

                  <Button
                    onClick={() => handleViewSession(session.id)}
                    className="w-full"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    View & Interact
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
