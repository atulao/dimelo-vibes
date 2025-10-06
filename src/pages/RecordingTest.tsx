import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: string;
}

export default function RecordingTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
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
      toast({
        title: "Recording Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsProcessing(true);
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
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Transcription failed');
        }

        const data = await response.json();
        
        if (data.text) {
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
    toast({
      title: "Transcript Cleared",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recording Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the recording and transcription features
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio Recorder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {!isRecording && !isProcessing && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-5 w-5" />
                  Stop Recording
                </Button>
              )}

              {isProcessing && (
                <Button size="lg" disabled className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </Button>
              )}

              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  Recording...
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {isRecording
                ? "Recording in progress. Click Stop when you're done."
                : isProcessing
                ? "Processing your audio..."
                : "Click Start Recording to begin testing transcription"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transcript</CardTitle>
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
              <div className="space-y-4">
                {transcriptSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className="p-4 border rounded-lg space-y-2 animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{segment.timestamp}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
