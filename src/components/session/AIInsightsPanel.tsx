import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb, CheckCircle, Quote, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIInsightsPanelProps {
  sessionId: string;
  canRegenerate?: boolean;
  sessionStatus?: string;
}

export const AIInsightsPanel = ({ sessionId, canRegenerate = false, sessionStatus }: AIInsightsPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsights();
    
    // Subscribe to realtime updates for insights
    const channel = supabase
      .channel('insights-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          console.log('Insights updated, refreshing...');
          fetchInsights();
        }
      )
      .subscribe();
    
    // Auto-refresh every 2 minutes if session is live
    let refreshInterval: NodeJS.Timeout | undefined;
    if (sessionStatus === 'live') {
      refreshInterval = setInterval(() => {
        console.log('Auto-refreshing insights (2min interval)...');
        fetchInsights(true); // Show updating state
      }, 2 * 60 * 1000); // 2 minutes
    }
    
    return () => {
      supabase.removeChannel(channel);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [sessionId, sessionStatus]);

  const fetchInsights = async (showUpdating = false) => {
    if (showUpdating) setUpdating(true);
    try {
      // Fetch only the latest version of insights
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("session_id", sessionId)
        .order("transcript_version", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50); // Limit to latest insights

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Filter to only show the latest version
        const latestVersion = data[0].transcript_version;
        const latestInsights = data.filter(i => i.transcript_version === latestVersion);
        
        setInsights(latestInsights);
        setLastUpdated(new Date(data[0].updated_at || data[0].created_at));
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      // Fetch all transcript segments
      const { data: segments, error: segmentsError } = await supabase
        .from("transcript_segments")
        .select("text")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (segmentsError) throw segmentsError;

      if (!segments || segments.length === 0) {
        toast({
          title: "No transcript available",
          description: "Cannot generate insights without transcript data.",
          variant: "destructive",
        });
        return;
      }

      const transcriptText = segments.map(s => s.text).join(" ");

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { 
          session_id: sessionId, 
          transcript_text: transcriptText 
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Insights Regenerated",
        description: "AI insights have been updated successfully.",
      });

      // Refresh insights
      await fetchInsights();
    } catch (error: any) {
      console.error("Error regenerating insights:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const summary = insights.find(i => i.insight_type === "summary")?.content;
  const keyPoints = insights.filter(i => i.insight_type === "key_point");
  const actionItems = insights.filter(i => i.insight_type === "action_item");
  const quotes = insights.filter(i => i.insight_type === "quote");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </CardTitle>
          {canRegenerate && insights.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          )}
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {getTimeAgo(lastUpdated)}
          </p>
        )}
        {sessionStatus === 'live' && insights.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Auto-updating every 2 minutes during live session
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading || regenerating ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </>
        ) : updating ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm font-medium mb-2">Updating insights...</p>
            <p className="text-xs text-muted-foreground">
              Processing new transcript content
            </p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              AI insights will be generated automatically as the session progresses...
            </p>
            <p className="text-xs text-muted-foreground">
              Insights are generated after 500 words of transcript
            </p>
          </div>
        ) : (
          <>
            {/* Summary So Far - Prominent Display */}
            {summary && (
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-primary">
                  <Brain className="h-5 w-5" />
                  Summary So Far
                </h3>
                <p className="text-sm leading-relaxed">
                  {summary}
                </p>
                {sessionStatus === 'live' && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      💡 This summary updates automatically every 2 minutes to help latecomers catch up
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Key Points */}
            {keyPoints.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Points
                </h3>
                <ul className="space-y-2 text-sm">
                  {keyPoints.slice(0, 7).map((insight) => (
                    <li key={insight.id} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">{insight.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {actionItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Action Items
                </h3>
                <ul className="space-y-2 text-sm">
                  {actionItems.slice(0, 5).map((insight) => (
                    <li key={insight.id} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span className="text-muted-foreground">{insight.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notable Quotes */}
            {quotes.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Quote className="h-4 w-4" />
                  Notable Quotes
                </h3>
                <div className="space-y-2">
                  {quotes.slice(0, 3).map((insight) => (
                    <div
                      key={insight.id}
                      className="p-3 bg-muted/50 rounded-md border-l-2 border-primary"
                    >
                      <p className="text-sm italic text-muted-foreground">
                        "{insight.content}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
