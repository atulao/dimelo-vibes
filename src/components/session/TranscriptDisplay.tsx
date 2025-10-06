import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscriptSegment {
  id: string;
  text: string;
  speaker_label: string | null;
  start_time: number | null;
  created_at: string;
}

interface TranscriptDisplayProps {
  sessionId: string;
}

export const TranscriptDisplay = ({ sessionId }: TranscriptDisplayProps) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(0);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSegments();
    
    // Subscribe to realtime updates for new transcript segments
    const channel = supabase
      .channel('transcript-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_segments',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('New transcript segment received:', payload);
          const newSegment = payload.new as TranscriptSegment;
          setSegments((current) => [...current, newSegment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  useEffect(() => {
    // Calculate word count from all segments
    const totalWords = segments.reduce((count, segment) => {
      return count + segment.text.split(/\s+/).length;
    }, 0);
    
    setWordCount(totalWords);

    // Auto-generate insights at thresholds
    if (totalWords >= 500 && lastGeneratedAt === 0) {
      generateInsights(totalWords);
    } else if (totalWords >= lastGeneratedAt + 1000 && lastGeneratedAt > 0) {
      generateInsights(totalWords);
    }
  }, [segments]);

  const generateInsights = async (currentWordCount: number) => {
    if (isGeneratingInsights) return;

    setIsGeneratingInsights(true);
    try {
      const transcriptText = segments.map(s => s.text).join(" ");

      console.log(`Generating insights for ${currentWordCount} words...`);

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { 
          session_id: sessionId, 
          transcript_text: transcriptText 
        }
      });

      if (error) {
        console.error('Error generating insights:', error);
        throw error;
      }

      console.log('Insights generated successfully:', data);
      setLastGeneratedAt(currentWordCount);

      toast({
        title: "Insights Updated",
        description: "AI insights have been generated from the transcript.",
      });
    } catch (error: any) {
      console.error("Error generating insights:", error);
      // Don't show error toast for auto-generation failures
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const fetchSegments = async () => {
    try {
      const { data, error } = await supabase
        .from("transcript_segments")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error("Error fetching transcript:", error);
    } finally {
      setLoading(false);
    }
  };

  const startDemoTranscript = async () => {
    setIsDemoRunning(true);
    toast({
      title: "Demo Started",
      description: "Simulating live transcript...",
    });

    const demoSegments = [
      "Welcome everyone to today's session on modern web development.",
      "We'll be covering React, TypeScript, and best practices for building scalable applications.",
      "Let's start with the fundamentals of component architecture.",
      "State management is crucial for maintaining data flow in your application.",
      "We'll explore different patterns and when to use each one.",
      "Performance optimization becomes important as your app grows.",
      "Let's look at some practical examples of code splitting and lazy loading.",
      "Testing is an essential part of the development workflow.",
      "We'll cover unit tests, integration tests, and end-to-end testing strategies.",
      "Thank you all for attending. Feel free to ask questions in the Q&A section.",
    ];

    for (let i = 0; i < demoSegments.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { error } = await supabase
        .from("transcript_segments")
        .insert({
          session_id: sessionId,
          text: demoSegments[i],
          speaker_label: "Speaker",
          start_time: i * 3,
        });

      if (error) {
        console.error("Error inserting demo segment:", error);
      }
      
      await fetchSegments();
    }

    setIsDemoRunning(false);
    toast({
      title: "Demo Complete",
      description: "Demo transcript finished.",
    });
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Live Transcript
            </CardTitle>
            {wordCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {wordCount} words
                {isGeneratingInsights && " • Generating insights..."}
              </p>
            )}
          </div>
          {segments.length === 0 && !isDemoRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={startDemoTranscript}
              disabled={isDemoRunning}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Demo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-6 pb-6 space-y-4"
        >
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : segments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center">
                Transcript will appear here when the session starts...
              </p>
            </div>
          ) : (
            segments.map((segment) => (
              <div key={segment.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {segment.speaker_label && (
                    <span className="font-medium">{segment.speaker_label}</span>
                  )}
                  {segment.start_time !== null && (
                    <span>{formatTime(segment.start_time)}</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{segment.text}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
