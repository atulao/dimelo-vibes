import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Play, Pause, Download, Volume2, AlertTriangle, Sparkles, X, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: string;
  confidence?: number;
  start?: number;
  end?: number;
}

export default function RecordingTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaConversation, setQaConversation] = useState<Array<{role: string, content: string}>>([]);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [hasAudioInput, setHasAudioInput] = useState(true);
  const [isPeaking, setIsPeaking] = useState(false);
  const [sampleRate, setSampleRate] = useState<number>(0);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [averageConfidence, setAverageConfidence] = useState<number | null>(null);
  
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsBrowserSupported(false);
        return;
      }
      if (typeof MediaRecorder === 'undefined') {
        setIsBrowserSupported(false);
        return;
      }
    };
    checkSupport();
  }, []);

  // Get available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };
    getDevices();
  }, [selectedDevice]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Audio playback controls
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setupAudioAnalyser = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalized = Math.min(100, (average / 255) * 100);
      
      setAudioLevel(normalized);
      setHasAudioInput(normalized > 1);
      setIsPeaking(normalized > 90);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  const startRecording = async () => {
    try {
      const constraints = {
        audio: selectedDevice 
          ? { deviceId: { exact: selectedDevice } }
          : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Get sample rate
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      setSampleRate(settings.sampleRate || 0);
      
      // Setup audio analysis
      setupAudioAnalyser(stream);
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        await processAudio(audioBlob);
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);

      toast({
        title: "Recording Started",
        description: "Speak into your microphone...",
      });
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Permission Denied",
          description: "Please allow microphone access to record audio.",
          variant: "destructive",
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No Microphone Found",
          description: "Please connect a microphone and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recording Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && isRecording && !isPaused) {
      mediaRecorder.pause();
      setIsPaused(true);
      toast({
        title: "Recording Paused",
      });
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && isRecording && isPaused) {
      mediaRecorder.resume();
      setIsPaused(false);
      toast({
        title: "Recording Resumed",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(true);
      setAudioLevel(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      // Stop the recorder without processing
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      setAudioChunks([]);
      setRecordedAudioBlob(null);
      setAudioLevel(0);
      setRecordingTime(0);
      
      toast({
        title: "Recording Cancelled",
        description: "Recording discarded without processing",
      });
    }
  };

  const generateSummary = async () => {
    if (transcriptSegments.length === 0) {
      toast({
        title: "No transcript available",
        description: "Record something first to generate a summary",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const fullTranscript = transcriptSegments.map(s => s.text).join(' ');
      
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { transcript: fullTranscript }
      });

      if (error) throw error;

      if (data?.summary) {
        setAiSummary(data.summary);
        toast({
          title: "Summary Generated",
          description: "AI has analyzed the transcript",
        });
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Failed to generate summary",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const askQuestion = async () => {
    if (!qaQuestion.trim() || transcriptSegments.length === 0) {
      return;
    }

    const fullTranscript = transcriptSegments.map(s => s.text).join(' ');
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
    } catch (error) {
      console.error('Error asking question:', error);
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

  const playAudio = () => {
    if (audioRef.current && recordedAudioBlob) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = URL.createObjectURL(recordedAudioBlob);
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const downloadAudio = () => {
    if (recordedAudioBlob) {
      const url = URL.createObjectURL(recordedAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your recording is being downloaded.",
      });
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              audio: base64Audio,
              sessionId: 'test-session',
              language: selectedLanguage,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Transcription failed');
        }

        const data = await response.json();
        
        if (data.segments && data.segments.length > 0) {
          const newSegments: TranscriptSegment[] = data.segments.map((seg: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            text: seg.text,
            timestamp: new Date(seg.start * 1000).toISOString().substr(14, 5),
            confidence: seg.confidence,
            start: seg.start,
            end: seg.end,
          }));
          
          setTranscriptSegments(prev => [...prev, ...newSegments]);
          
          if (data.averageConfidence !== null) {
            setAverageConfidence(data.averageConfidence);
            
            if (data.averageConfidence < 0.8) {
              toast({
                title: "Low Confidence Warning",
                description: `Average confidence: ${(data.averageConfidence * 100).toFixed(0)}%. Audio quality may be poor.`,
                variant: "destructive",
              });
            }
          }
          
          toast({
            title: "Transcription Complete",
            description: `Detected language: ${data.language || 'Unknown'}`,
          });
        } else if (data.text) {
          // Fallback for single text response
          const newSegment: TranscriptSegment = {
            id: Date.now().toString(),
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
          };
          
          setTranscriptSegments(prev => [...prev, newSegment]);
          
          toast({
            title: "Transcription Complete",
            description: "Your audio has been transcribed",
          });
        }
        
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const clearTranscript = () => {
    setTranscriptSegments([]);
    setAverageConfidence(null);
    toast({
      title: "Transcript Cleared",
    });
  };

  // Auto-scroll to latest segment
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptSegments]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recording Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the recording and transcription features
          </p>
        </div>

        {!isBrowserSupported && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support audio recording. Please use Chrome, Edge, or Firefox.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Microphone</label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices.filter(device => device.deviceId).map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sampleRate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sample Rate:</span>
                <Badge variant="secondary">{sampleRate} Hz</Badge>
              </div>
            )}

            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audio Level:</span>
                  {isPeaking && (
                    <Badge variant="destructive" className="animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Peaking!
                    </Badge>
                  )}
                  {!hasAudioInput && (
                    <Badge variant="secondary">
                      No audio detected
                    </Badge>
                  )}
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-100 ${
                      isPeaking ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Recording Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              {!isRecording && !isProcessing && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="flex items-center gap-2"
                  disabled={!isBrowserSupported}
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={pauseRecording}
                      size="lg"
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-5 w-5" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={resumeRecording}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Play className="h-5 w-5" />
                      Resume
                    </Button>
                  )}
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop Recording
                  </Button>
                  <Button
                    onClick={cancelRecording}
                    size="lg"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    Cancel
                  </Button>
                  <Badge variant={isPaused ? "secondary" : "destructive"} className={isPaused ? "" : "animate-pulse"}>
                    <div className="w-2 h-2 rounded-full bg-white mr-2" />
                    {formatTime(recordingTime)} {isPaused && "(Paused)"}
                  </Badge>
                </>
              )}

              {isProcessing && (
                <Button size="lg" disabled className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {isRecording
                ? "Recording in progress. You can record for 5+ minutes."
                : isProcessing
                ? "Processing your audio..."
                : "Click Start Recording to begin testing transcription"}
            </p>
          </CardContent>
        </Card>

        {recordedAudioBlob && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Playback Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  onClick={playAudio}
                  size="lg"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Play Recording
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={downloadAudio}
                  size="lg"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="font-medium">{volume[0]}%</span>
                </div>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {transcriptSegments.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>AI Summary</CardTitle>
              <Button 
                onClick={generateSummary}
                disabled={isGeneratingSummary}
                variant="outline"
                size="sm"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Summary
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {aiSummary ? (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {aiSummary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Summary" to create a comprehensive AI-powered summary of your transcript</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Q&A Section - Available whenever transcript exists */}
        {transcriptSegments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {qaConversation.map((msg, idx) => (
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
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transcript</CardTitle>
              {averageConfidence !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Average Confidence:</span>
                  <Badge variant={averageConfidence >= 0.8 ? "default" : "destructive"}>
                    {(averageConfidence * 100).toFixed(0)}%
                  </Badge>
                  {averageConfidence < 0.8 && (
                    <Badge variant="outline" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Quality
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {transcriptSegments.length > 0 && (
              <Button onClick={clearTranscript} variant="outline" size="sm">
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {transcriptSegments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transcript yet. Start recording to see results here.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcriptSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className={`p-4 border rounded-lg space-y-2 animate-fade-in transition-colors ${
                      segment.confidence && segment.confidence < 0.7 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {segment.timestamp}
                        </Badge>
                        {segment.confidence !== undefined && (
                          <Badge 
                            variant={segment.confidence >= 0.7 ? "outline" : "destructive"}
                            className="text-xs"
                          >
                            {(segment.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        )}
                      </div>
                      {segment.start !== undefined && segment.end !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
