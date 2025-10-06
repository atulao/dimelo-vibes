import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play } from "lucide-react";

interface TranscriptSegment {
  id: string;
  text: string;
  start_time: number;
  created_at: string;
  speaker_label?: string;
}

interface TranscriptDisplayProps {
  sessionId: string;
}

export const TranscriptDisplay = ({ sessionId }: TranscriptDisplayProps) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchTranscripts();
    
    // Poll for new transcripts every 5 seconds
    const interval = setInterval(fetchTranscripts, 5000);
    
    return () => {
      clearInterval(interval);
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when new segments arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  const fetchTranscripts = async () => {
    try {
      const { data, error } = await supabase
        .from("transcript_segments")
        .select("*")
        .eq("session_id", sessionId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (data) setSegments(data);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
    }
  };

  const startDemoTranscript = () => {
    setIsDemo(true);
    
    const demoTexts = [
      "Welcome everyone to today's session on real-time AI transcription.",
      "We're going to explore how artificial intelligence can enhance conference experiences.",
      "One of the key challenges at conferences is information overload.",
      "With live transcription, attendees never miss important moments.",
      "The system captures every word spoken during the session.",
      "AI then processes this information to generate insights and summaries.",
      "This allows participants to focus on networking and engagement.",
      "Rather than frantically trying to take notes on everything.",
      "Questions can be submitted in real-time through the platform.",
      "And speakers can address them without interrupting the flow.",
    ];

    let index = 0;
    demoIntervalRef.current = setInterval(() => {
      if (index >= demoTexts.length) {
        if (demoIntervalRef.current) {
          clearInterval(demoIntervalRef.current);
        }
        return;
      }

      const newSegment: TranscriptSegment = {
        id: `demo-${Date.now()}-${index}`,
        text: demoTexts[index],
        start_time: index * 3,
        created_at: new Date().toISOString(),
        speaker_label: "Speaker",
      };

      setSegments((prev) => [...prev, newSegment]);
      index++;
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Transcript</CardTitle>
          {segments.length === 0 && !isDemo && (
            <Button onClick={startDemoTranscript} variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start Demo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollRef}>
          {segments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Waiting for transcript...</p>
              <p className="text-sm mt-2">Click "Start Demo" to see how it works</p>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="p-4 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDuration: "500ms" }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-muted-foreground min-w-[3rem]">
                      {formatTime(segment.start_time)}
                    </span>
                    <p className="text-sm leading-relaxed flex-1">{segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
