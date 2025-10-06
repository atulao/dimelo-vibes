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
}

export const AIInsightsPanel = ({ sessionId, canRegenerate = false }: AIInsightsPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
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
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchInsights = async () => {
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
            Last updated: {lastUpdated.toLocaleTimeString()}
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
            {/* Summary */}
            {summary && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Summary
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {summary}
                </p>
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
