import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Share2,
  Lock,
  Unlock,
  Copy,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface TranscriptSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number | null;
  speaker_label: string | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  recording_url: string | null;
  is_public: boolean;
  speaker_name: string | null;
}

interface AIInsight {
  id: string;
  insight_type: string;
  content: string;
  created_at: string;
}

export default function SessionReplay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaConversation, setQaConversation] = useState<Array<{role: string, content: string}>>([]);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSessionData();
    }
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      highlightCurrentSegment(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log("Audio loaded, duration:", audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      toast({
        title: "Audio Error",
        description: "Failed to load audio recording.",
        variant: "destructive",
      });
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      console.log("Audio can play, ready state:", audio.readyState);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [session?.recording_url, segments]);

  const fetchSessionData = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id, title, description, recording_url, is_public, speaker_name")
        .eq("id", id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData.recording_url) {
        toast({
          title: "No Recording",
          description: "This session does not have a recording available.",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      setSession(sessionData);
      setIsPublic(sessionData.is_public);

      const { data: segmentsData } = await supabase
        .from("transcript_segments")
        .select("*")
        .eq("session_id", id)
        .order("start_time", { ascending: true });

      setSegments(segmentsData || []);

      const { data: insightsData } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: false });

      setInsights(insightsData || []);
    } catch (error: any) {
      console.error("Error fetching session:", error);
      toast({
        title: "Error",
        description: "Failed to load session data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const highlightCurrentSegment = (time: number) => {
    const segment = segments.find(
      (s) =>
        s.start_time <= time &&
        (s.end_time === null || s.end_time >= time)
    );
    setActiveSegmentId(segment?.id || null);
  };

  const togglePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error: any) {
          console.error("Error playing audio:", error);
          toast({
            title: "Playback Error",
            description: "Failed to play audio. The recording may not be available.",
            variant: "destructive",
          });
          setIsPlaying(false);
        }
      }
    }
  };

  const handleSegmentClick = async (startTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      if (!isPlaying) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Error playing audio:", error);
        }
      }
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const downloadTranscript = () => {
    const transcriptText = segments
      .map((s) => `[${formatTime(s.start_time)}] ${s.speaker_label || "Speaker"}: ${s.text}`)
      .join("\n\n");

    const blob = new Blob([transcriptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session?.title || "transcript"}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Transcript downloaded successfully.",
    });
  };

  const togglePublic = async () => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ is_public: !isPublic })
        .eq("id", id);

      if (error) throw error;

      setIsPublic(!isPublic);
      toast({
        title: "Updated",
        description: `Session is now ${!isPublic ? "public" : "private"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update session visibility.",
        variant: "destructive",
      });
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/session/${id}/replay`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Share link copied to clipboard.",
    });
  };

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${window.location.origin}/session/${id}/replay" width="800" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Copied",
      description: "Embed code copied to clipboard.",
    });
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim() || segments.length === 0) {
      return;
    }

    const fullTranscript = segments.map(s => s.text).join(' ');
    const currentQuestion = qaQuestion.trim();
    
    // Add user question to conversation
    setQaConversation(prev => [...prev, { role: "user", content: currentQuestion }]);
    setQaQuestion("");
    setIsAskingQuestion(true);

    try {
      const { data, error } = await supabase.functions.invoke('transcript-qa', {
        body: { 
          transcript: fullTranscript,
          question: currentQuestion,
          conversationHistory: qaConversation
        }
      });

      if (error) throw error;

      if (data?.answer) {
        // Add AI answer to conversation
        setQaConversation(prev => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (error: any) {
      toast({
        title: "Failed to get answer",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      // Remove the user question if we failed to get an answer
      setQaConversation(prev => prev.slice(0, -1));
    } finally {
      setIsAskingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Session</DialogTitle>
                  <DialogDescription>
                    Share this session replay with others
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="public-toggle">Public Access</Label>
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Unlock className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Switch
                        id="public-toggle"
                        checked={isPublic}
                        onCheckedChange={togglePublic}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Share Link</Label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/session/${id}/replay`}
                        readOnly
                        className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                      />
                      <Button size="sm" onClick={copyShareLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Embed Code</Label>
                    <div className="mt-2">
                      <Textarea
                        value={`<iframe src="${window.location.origin}/session/${id}/replay" width="800" height="600" frameborder="0"></iframe>`}
                        readOnly
                        rows={3}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={copyEmbedCode}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Embed Code
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={downloadTranscript}>
              <Download className="mr-2 h-4 w-4" />
              Download Transcript
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h1 className="text-2xl font-bold mb-2">{session.title}</h1>
              {session.speaker_name && (
                <p className="text-muted-foreground mb-4">
                  by {session.speaker_name}
                </p>
              )}
              {session.description && (
                <p className="text-sm text-muted-foreground mb-6">
                  {session.description}
                </p>
              )}

              <audio
                ref={audioRef}
                src={session.recording_url || ""}
                preload="metadata"
              />

              <div className="space-y-4">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    size="lg"
                    onClick={togglePlayPause}
                    className="w-32"
                  >
                    {isPlaying ? (
                      <Pause className="mr-2 h-5 w-5" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>

                  <div className="flex gap-2">
                    {[0.5, 1, 1.5, 2].map((rate) => (
                      <Button
                        key={rate}
                        variant={playbackRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePlaybackRateChange(rate)}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                Ask Questions
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ask a question about the transcript..."
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askQuestion();
                      }
                    }}
                    disabled={isAskingQuestion}
                    className="flex-1"
                  />
                  <Button
                    onClick={askQuestion}
                    disabled={isAskingQuestion || !qaQuestion.trim()}
                    size="sm"
                  >
                    {isAskingQuestion ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {qaConversation.length > 0 && (
                  <div className="space-y-3">
                    {[...qaConversation].reverse().map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted/50 mr-8'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 text-muted-foreground">
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Transcript</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {segments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No transcript available for this session.
                  </p>
                ) : (
                  segments.map((segment) => (
                    <div
                      key={segment.id}
                      onClick={() => handleSegmentClick(segment.start_time)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        activeSegmentId === segment.id
                          ? "bg-primary/10 border-l-4 border-primary"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {formatTime(segment.start_time)}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">
                            {segment.speaker_label || "Speaker"}
                          </p>
                          <p className="text-sm">{segment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
