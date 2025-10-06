import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface SpeakingTimeBreakdownProps {
  sessionId: string;
}

interface SpeakerStats {
  speaker: string;
  duration: number;
  segmentCount: number;
  percentage: number;
}

export const SpeakingTimeBreakdown = ({ sessionId }: SpeakingTimeBreakdownProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SpeakerStats[]>([]);

  useEffect(() => {
    fetchSpeakingStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('speaking-time-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcript_segments',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchSpeakingStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSpeakingStats = async () => {
    try {
      const { data, error } = await supabase
        .from("transcript_segments")
        .select("speaker_name, start_time, end_time")
        .eq("session_id", sessionId)
        .not("speaker_name", "is", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Calculate speaking time per speaker
      const speakerMap = new Map<string, { duration: number; count: number }>();
      let totalDuration = 0;

      // Estimate duration based on word count if timestamps not available
      data.forEach((segment, index) => {
        const speaker = segment.speaker_name || "Unknown";
        const duration = segment.end_time && segment.start_time
          ? Number(segment.end_time) - Number(segment.start_time)
          : 3; // Assume 3 seconds per segment if no timestamps

        totalDuration += duration;

        if (!speakerMap.has(speaker)) {
          speakerMap.set(speaker, { duration: 0, count: 0 });
        }

        const current = speakerMap.get(speaker)!;
        current.duration += duration;
        current.count += 1;
      });

      // Convert to array and calculate percentages
      const statsArray: SpeakerStats[] = Array.from(speakerMap.entries())
        .map(([speaker, { duration, count }]) => ({
          speaker,
          duration,
          segmentCount: count,
          percentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
        }))
        .sort((a, b) => b.duration - a.duration);

      setStats(statsArray);
    } catch (error) {
      console.error("Error fetching speaking stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Speaking Time Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : stats.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              No speaker data available yet
            </p>
          </div>
        ) : (
          stats.map((stat) => (
            <div key={stat.speaker} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{stat.speaker}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stat.segmentCount} segments)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{formatDuration(stat.duration)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stat.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress value={stat.percentage} className="h-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};