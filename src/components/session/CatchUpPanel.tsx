import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface CatchUpPanelProps {
  sessionId: string;
  sessionStartTime: string | null;
  onDismiss: () => void;
  onViewTranscript: () => void;
}

export const CatchUpPanel = ({ 
  sessionId, 
  sessionStartTime,
  onDismiss,
  onViewTranscript 
}: CatchUpPanelProps) => {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (sessionStartTime) {
      const updateTimeAgo = () => {
        setTimeAgo(formatDistanceToNow(new Date(sessionStartTime), { addSuffix: true }));
      };
      updateTimeAgo();
      const interval = setInterval(updateTimeAgo, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [sessionStartTime]);

  useEffect(() => {
    fetchCatchUpSummary();
  }, [sessionId]);

  const fetchCatchUpSummary = async () => {
    try {
      setLoading(true);
      
      // Get the latest summary insight
      const { data: summaryData, error } = await supabase
        .from("ai_insights")
        .select("content")
        .eq("session_id", sessionId)
        .eq("insight_type", "summary")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (summaryData) {
        setSummary(summaryData.content);
      } else {
        // Get recent transcript segments as fallback
        const { data: transcriptData, error: transcriptError } = await supabase
          .from("transcript_segments")
          .select("text")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (transcriptError) throw transcriptError;

        if (transcriptData && transcriptData.length > 0) {
          setSummary(
            "Recent discussion points:\n" + 
            transcriptData.reverse().map(t => `• ${t.text.substring(0, 100)}...`).join("\n")
          );
        } else {
          setSummary("Session is in progress. Join live to see the discussion as it happens.");
        }
      }
    } catch (error) {
      console.error("Error fetching catch-up summary:", error);
      setSummary("Unable to load session summary. Join live to see what's happening.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg animate-scale-in">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Session In Progress</h2>
              </div>
              <p className="text-muted-foreground">
                This session started {timeAgo}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Catch Up Summary
              </Badge>
            </div>

            <div className="p-4 bg-muted rounded-lg min-h-[150px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {summary}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onViewTranscript}
              variant="outline"
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Full Transcript
            </Button>
            <Button
              onClick={onDismiss}
              className="flex-1"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Join Live
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can always access the transcript and AI insights from the panels below
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
