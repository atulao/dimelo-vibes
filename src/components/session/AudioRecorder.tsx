// Audio recorder component with speaker tracking
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioRecorderProps {
  sessionId: string;
  isSessionLive: boolean;
  expectedSpeakers?: string[];
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const AudioRecorder = ({ sessionId, isSessionLive, expectedSpeakers = [] }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load current speaker from session
    loadCurrentSpeaker();

    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    }
  }, []);

  const loadCurrentSpeaker = async () => {
    const { data: session } = await supabase
      .from('sessions')
      .select('current_speaker')
      .eq('id', sessionId)
      .single();

    if (session?.current_speaker) {
      setCurrentSpeaker(session.current_speaker);
    } else if (expectedSpeakers.length > 0) {
      setCurrentSpeaker(expectedSpeakers[0]);
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveTranscriptSegment = async (
    text: string,
    isFinal: boolean,
    confidence: number,
    timestamp: number
  ) => {
    try {
      const { error } = await supabase
        .from("transcript_segments")
        .insert({
          session_id: sessionId,
          text: text,
          start_time: timestamp,
          confidence: confidence,
          speaker_label: "Speaker",
          speaker_name: currentSpeaker || undefined,
        });

      if (error) {
        console.error("Error saving transcript:", error);
      }
    } catch (error) {
      console.error("Error saving transcript segment:", error);
    }
  };

  const uploadRecording = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `${user.id}/${sessionId}_${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("session-recordings")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("session-recordings")
        .getPublicUrl(fileName);

      await supabase
        .from("sessions")
        .update({ recording_url: publicUrl })
        .eq("id", sessionId);

      toast({
        title: "Recording Saved",
        description: "Audio recording has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading recording:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload recording.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request microphone permission and start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
        console.log("Speech recognition started");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.resultIndex];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;
        const timestamp = Date.now() / 1000; // Convert to seconds

        console.log("Transcript:", transcript, "Final:", isFinal, "Confidence:", confidence);

        // Save final results to database
        if (isFinal && transcript.trim()) {
          saveTranscriptSegment(transcript, isFinal, confidence, timestamp);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        let errorMessage = "An error occurred during speech recognition.";
        
        if (event.error === 'not-allowed') {
          errorMessage = "Microphone permission denied. Please allow microphone access.";
        } else if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please speak into your microphone.";
        } else if (event.error === 'network') {
          errorMessage = "Network error. Please check your connection.";
        }

        setError(errorMessage);
        setIsRecording(false);
        toast({
          title: "Recording Error",
          description: errorMessage,
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        if (isRecording) {
          // Auto-restart if still recording (unless manually stopped)
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Update session recording status
      await supabase
        .from("sessions")
        .update({ is_recording: true })
        .eq("id", sessionId);

      toast({
        title: "Recording Started",
        description: "Live transcription is now active.",
      });
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setError(error.message || "Failed to start recording");
      toast({
        title: "Error",
        description: error.message || "Failed to start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    // Update session recording status
    await supabase
      .from("sessions")
      .update({ is_recording: false })
      .eq("id", sessionId);

    toast({
      title: "Recording Stopped",
      description: "Processing and uploading recording...",
    });
  };

  const handleSpeakerChange = async (speaker: string) => {
    setCurrentSpeaker(speaker);
    // Update current speaker in database
    await supabase
      .from("sessions")
      .update({ current_speaker: speaker })
      .eq("id", sessionId);
  };

  // Recording is now available at any time, not just during live sessions

  return (
    <div className="space-y-4">
      {expectedSpeakers.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Speaker</label>
          <Select value={currentSpeaker} onValueChange={handleSpeakerChange}>
            <SelectTrigger className="w-full bg-background z-50">
              <SelectValue placeholder="Select speaker" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {expectedSpeakers.filter(speaker => speaker && speaker.trim()).map((speaker) => (
                <SelectItem key={speaker} value={speaker}>
                  {speaker}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={!isSupported}
            className="flex-1"
            size="lg"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="flex-1"
            size="lg"
          >
            <MicOff className="mr-2 h-5 w-5" />
            Stop Recording
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-md border border-red-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {formatTime(recordingTime)}
          </Badge>
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-md border border-blue-500/20">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Uploading recording...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-amber-500/10 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-900 dark:text-amber-100">{error}</p>
        </div>
      )}

      {!isSupported && (
        <div className="p-3 bg-amber-500/10 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-100">
            <p className="font-medium mb-1">Browser Not Supported</p>
            <p>Please use Chrome or Edge for live transcription features.</p>
          </div>
        </div>
      )}
    </div>
  );
};