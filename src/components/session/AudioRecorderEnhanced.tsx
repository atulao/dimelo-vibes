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

interface AudioRecorderEnhancedProps {
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

export const AudioRecorderEnhanced = ({ sessionId, isSessionLive, expectedSpeakers = [] }: AudioRecorderEnhancedProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [provider, setProvider] = useState<'browser' | 'whisper'>('browser');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const whisperIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition && provider === 'browser') {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge, or switch to Whisper.");
    }
  }, []);

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

  const loadSettings = async () => {
    const { data: session } = await supabase
      .from('sessions')
      .select('transcription_provider, transcription_settings, current_speaker')
      .eq('id', sessionId)
      .single();

    if (session) {
      const providerValue = session.transcription_provider || 'browser';
      if (providerValue === 'browser' || providerValue === 'whisper') {
        setProvider(providerValue);
      }
      
      const settings = session.transcription_settings as { selectedDevice?: string } | null;
      if (settings?.selectedDevice) {
        setSelectedDevice(settings.selectedDevice);
      }

      if (session.current_speaker) {
        setCurrentSpeaker(session.current_speaker);
      } else if (expectedSpeakers.length > 0) {
        setCurrentSpeaker(expectedSpeakers[0]);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveTranscriptSegment = async (
    text: string,
    confidence: number,
    timestamp: number,
    speakerId?: string,
    speakerName?: string
  ) => {
    try {
      const { error } = await supabase
        .from("transcript_segments")
        .insert({
          session_id: sessionId,
          text: text,
          start_time: timestamp,
          confidence: confidence,
          speaker_label: speakerId || "Speaker",
          speaker_name: speakerName,
        });

      if (error) {
        console.error("Error saving transcript:", error);
      }
    } catch (error) {
      console.error("Error saving transcript segment:", error);
    }
  };

  const transcribeWithWhisper = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await base64Promise;
      
      // Call transcription edge function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio, sessionId }
      });
      
      if (error) throw error;
      
      if (data?.text) {
        await saveTranscriptSegment(
          data.text,
          1.0, // Whisper doesn't provide confidence
          Date.now() / 1000,
          undefined,
          currentSpeaker || undefined
        );
        
        console.log('Whisper transcription:', data.text);
      }
    } catch (error) {
      console.error('Whisper transcription error:', error);
      toast({
        title: "Transcription Error",
        description: error instanceof Error ? error.message : "Failed to transcribe audio",
        variant: "destructive",
      });
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
    if (provider === 'browser' && !isSupported) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request microphone permission and start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Start MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      if (provider === 'whisper') {
        // For Whisper, send audio chunks periodically (every 30 seconds)
        let currentChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            currentChunks.push(event.data);
            audioChunksRef.current.push(event.data);
          }
        };

        // Send chunks to Whisper every 30 seconds
        whisperIntervalRef.current = setInterval(async () => {
          if (currentChunks.length > 0) {
            const audioBlob = new Blob(currentChunks, { type: "audio/webm" });
            await transcribeWithWhisper(audioBlob);
            currentChunks = [];
          }
        }, 30000);

        // Request data every 5 seconds to build up chunks
        mediaRecorder.start(5000);
      } else {
        // For browser, just accumulate for final upload
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start();
      }

      mediaRecorder.onstop = async () => {
        if (whisperIntervalRef.current) {
          clearInterval(whisperIntervalRef.current);
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start browser speech recognition if using browser provider
      if (provider === 'browser') {
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
          const timestamp = Date.now() / 1000;

          console.log("Transcript:", transcript, "Final:", isFinal, "Confidence:", confidence);

          if (isFinal && transcript.trim()) {
            saveTranscriptSegment(
              transcript,
              confidence,
              timestamp,
              undefined,
              currentSpeaker || undefined
            );
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
            recognition.start();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        // Whisper mode - just set recording state
        setIsRecording(true);
        setError(null);
      }

      // Update session recording status
      await supabase
        .from("sessions")
        .update({ is_recording: true })
        .eq("id", sessionId);

      toast({
        title: "Recording Started",
        description: provider === 'whisper' 
          ? "Using OpenAI Whisper for high-accuracy transcription."
          : "Live transcription is now active.",
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

    if (whisperIntervalRef.current) {
      clearInterval(whisperIntervalRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

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
              {expectedSpeakers.map((speaker) => (
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
            disabled={!isSupported && provider === 'browser'}
            className="flex-1"
            size="lg"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start Recording ({provider === 'whisper' ? 'Whisper' : 'Browser'})
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
            <span className="text-sm font-medium">Recording with {provider === 'whisper' ? 'OpenAI Whisper' : 'Browser'}</span>
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

      {!isSupported && provider === 'browser' && (
        <div className="p-3 bg-amber-500/10 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-100">
            <p className="font-medium mb-1">Browser Not Supported</p>
            <p>Please use Chrome or Edge for browser transcription, or switch to Whisper in settings.</p>
          </div>
        </div>
      )}
    </div>
  );
};
