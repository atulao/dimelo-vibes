import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, FileText, CheckCircle } from "lucide-react";

interface AIInsightsPanelProps {
  sessionId: string;
}

export const AIInsightsPanel = ({ sessionId }: AIInsightsPanelProps) => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
    
    // Poll for insights every 10 seconds
    const interval = setInterval(fetchInsights, 10000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setInsights(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      setLoading(false);
    }
  };

  const getInsightsByType = (type: string) => {
    return insights.filter((i) => i.insight_type === type);
  };

  const InsightSection = ({ 
    title, 
    icon: Icon, 
    type, 
    emptyText 
  }: { 
    title: string; 
    icon: any; 
    type: string; 
    emptyText: string;
  }) => {
    const sectionInsights = getInsightsByType(type);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : sectionInsights.length > 0 ? (
            <ul className="space-y-2">
              {sectionInsights.map((insight) => (
                <li
                  key={insight.id}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {insight.content}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">{emptyText}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <InsightSection
        title="Summary"
        icon={FileText}
        type="summary"
        emptyText="Summary will appear as the session progresses..."
      />
      
      <InsightSection
        title="Key Points"
        icon={Lightbulb}
        type="key_point"
        emptyText="Key points will be extracted from the discussion..."
      />
      
      <InsightSection
        title="Action Items"
        icon={CheckCircle}
        type="action_item"
        emptyText="Action items will be identified automatically..."
      />
    </div>
  );
};
