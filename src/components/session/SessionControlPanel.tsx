import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  Users, 
  MessageCircle, 
  Activity,
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AudioRecorder } from "./AudioRecorder";

interface SessionControlPanelProps {
  sessionId: string;
  sessionStatus: string;
  onStatusChange?: () => void;
}

interface Analytics {
  attendeeCount: number;
  questionCount: number;
  transcriptSegments: number;
}

export const SessionControlPanel = ({ 
  sessionId, 
  sessionStatus,
  onStatusChange 
}: SessionControlPanelProps) => {
  const [status, setStatus] = useState(sessionStatus);
  const [analytics, setAnalytics] = useState<Analytics>({
    attendeeCount: 0,
    questionCount: 0,
    transcriptSegments: 0,
  });
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setStatus(sessionStatus);
  }, [sessionStatus]);

  useEffect(() => {
    if (status === "live") {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [status, sessionId]);

  const fetchAnalytics = async () => {
    try {
      // Count questions
      const { count: questionCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      // Count transcript segments
      const { count: transcriptCount } = await supabase
        .from("transcript_segments")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      // For now, we don't have a way to track unique attendees
      // This would require a separate tracking mechanism
      setAnalytics({
        attendeeCount: 0, // TODO: Implement attendee tracking
        questionCount: questionCount || 0,
        transcriptSegments: transcriptCount || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ 
          status: "live",
          is_recording: true 
        })
        .eq("id", sessionId);

      if (error) throw error;

      setStatus("live");
      toast({
        title: "Session Started",
        description: "Your session is now live!",
      });
      onStatusChange?.();
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

  const handleEndSession = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ 
          status: "completed",
          is_recording: false 
        })
        .eq("id", sessionId);

      if (error) throw error;

      setStatus("completed");
      toast({
        title: "Session Ended",
        description: "Your session has been completed.",
      });
      onStatusChange?.();
      setShowEndDialog(false);
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Session Controls
            </span>
            {status === "live" && (
              <Badge className="bg-red-500 animate-pulse">
                🔴 LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session Control Buttons */}
          <div className="space-y-2">
            {status === "scheduled" && (
              <Button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Session
              </Button>
            )}

            {status === "live" && (
              <Button
                onClick={() => setShowEndDialog(true)}
                disabled={loading}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Square className="mr-2 h-5 w-5" />
                End Session
              </Button>
            )}

            {status === "completed" && (
              <div className="text-center p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  This session has ended
                </p>
              </div>
            )}
          </div>

          {/* Audio Recording Controls */}
          <AudioRecorder 
            sessionId={sessionId}
            isSessionLive={status === "live"}
          />

          {/* Live Analytics */}
          {status === "live" && (
            <>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Live Analytics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Attendees</span>
                    </div>
                    <p className="text-2xl font-bold">{analytics.attendeeCount}</p>
                  </div>

                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">Questions</span>
                    </div>
                    <p className="text-2xl font-bold">{analytics.questionCount}</p>
                  </div>

                  <div className="col-span-2 p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs">Transcript Segments</span>
                    </div>
                    <p className="text-2xl font-bold">{analytics.transcriptSegments}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  Make sure to monitor questions and respond to attendees during your session.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this session? This will stop recording and mark the session as completed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
