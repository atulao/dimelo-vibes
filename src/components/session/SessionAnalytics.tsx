import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionAnalyticsProps {
  sessionId: string;
}

interface Analytics {
  totalAttendees: number;
  peakConcurrent: number;
  averageTimeSpent: number;
  totalQuestions: number;
  answeredQuestions: number;
  engagementScore: number;
}

export const SessionAnalytics = ({ sessionId }: SessionAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalAttendees: 0,
    peakConcurrent: 0,
    averageTimeSpent: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    engagementScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [sessionId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch all attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from("session_attendees")
        .select("joined_at, left_at")
        .eq("session_id", sessionId);

      if (attendeesError) throw attendeesError;

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("is_answered")
        .eq("session_id", sessionId);

      if (questionsError) throw questionsError;

      // Calculate metrics
      const totalAttendees = attendees?.length || 0;
      const answeredQuestions = questions?.filter(q => q.is_answered).length || 0;
      const totalQuestions = questions?.length || 0;

      // Calculate average time spent
      let totalTimeSpent = 0;
      attendees?.forEach(attendee => {
        const joinedAt = new Date(attendee.joined_at).getTime();
        const leftAt = attendee.left_at 
          ? new Date(attendee.left_at).getTime()
          : new Date().getTime();
        totalTimeSpent += (leftAt - joinedAt) / 60000; // Convert to minutes
      });
      const averageTimeSpent = totalAttendees > 0 
        ? Math.round(totalTimeSpent / totalAttendees)
        : 0;

      // Calculate peak concurrent attendees
      // Create timeline of join/leave events
      const events: { time: number; type: 'join' | 'leave' }[] = [];
      attendees?.forEach(attendee => {
        events.push({ time: new Date(attendee.joined_at).getTime(), type: 'join' });
        if (attendee.left_at) {
          events.push({ time: new Date(attendee.left_at).getTime(), type: 'leave' });
        }
      });
      events.sort((a, b) => a.time - b.time);

      let currentConcurrent = 0;
      let peakConcurrent = 0;
      events.forEach(event => {
        if (event.type === 'join') {
          currentConcurrent++;
          peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
        } else {
          currentConcurrent--;
        }
      });

      // Calculate engagement score (0-100)
      // Factors: questions asked, time spent, question answer rate
      const questionEngagement = Math.min(totalQuestions * 10, 40); // Max 40 points
      const timeEngagement = Math.min(averageTimeSpent / 2, 30); // Max 30 points
      const answerEngagement = totalQuestions > 0 
        ? (answeredQuestions / totalQuestions) * 30 
        : 0; // Max 30 points
      const engagementScore = Math.round(questionEngagement + timeEngagement + answerEngagement);

      setAnalytics({
        totalAttendees,
        peakConcurrent,
        averageTimeSpent,
        totalQuestions,
        answeredQuestions,
        engagementScore,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getEngagementLabel = (score: number) => {
    if (score >= 70) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        ) : (
          <div className="space-y-4">
            {/* Engagement Score */}
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Engagement Score</span>
                <Badge className={getEngagementColor(analytics.engagementScore)}>
                  {getEngagementLabel(analytics.engagementScore)}
                </Badge>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{analytics.engagementScore}</span>
                <span className="text-sm text-muted-foreground mb-1">/100</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Total Attendees</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalAttendees}</p>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Peak Concurrent</span>
                </div>
                <p className="text-2xl font-bold">{analytics.peakConcurrent}</p>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Avg. Time Spent</span>
                </div>
                <p className="text-2xl font-bold">{analytics.averageTimeSpent}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>

              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">Questions</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.answeredQuestions} answered
                </p>
              </div>
            </div>

            {/* Insights */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold mb-2">Key Insights</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {analytics.peakConcurrent > analytics.totalAttendees * 0.7 && (
                  <li>• High retention rate - most attendees stayed throughout</li>
                )}
                {analytics.totalQuestions > analytics.totalAttendees * 0.5 && (
                  <li>• Very interactive session with lots of questions</li>
                )}
                {analytics.averageTimeSpent > 30 && (
                  <li>• Excellent engagement with above-average watch time</li>
                )}
                {analytics.answeredQuestions === analytics.totalQuestions && analytics.totalQuestions > 0 && (
                  <li>• All questions were answered - great speaker engagement!</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
