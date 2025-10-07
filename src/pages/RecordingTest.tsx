import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Play, Pause, Download, Volume2, AlertTriangle, Sparkles, X, Send, MessageSquare, FileDown, Upload, Save, QrCode, ExternalLink } from "lucide-react";
import html2pdf from "html2pdf.js";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeDialog } from "@/components/sessions/QRCodeDialog";
import { useNavigate } from "react-router-dom";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [hasAudioInput, setHasAudioInput] = useState(true);
  const [isPeaking, setIsPeaking] = useState(false);
  const [sampleRate, setSampleRate] = useState<number>(0);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [averageConfidence, setAverageConfidence] = useState<number | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [rollingSummaries, setRollingSummaries] = useState<Array<{timestamp: string, summary: string}>>([]);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [savedSession, setSavedSession] = useState<{ id: string; title: string } | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [conferences, setConferences] = useState<Array<{ id: string; name: string; tracks: Array<{ id: string; name: string }> }>>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout>();
  const lastProcessedDurationRef = useRef<number>(0);
  const accumulatedChunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();
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
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [recordedAudioBlob]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch available conferences and tracks
  useEffect(() => {
    const fetchConferencesAndTracks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: conferencesData } = await supabase
        .from('conferences')
        .select(`
          id,
          name,
          tracks (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (conferencesData) {
        setConferences(conferencesData as any);
        // Auto-select first track if available
        if (conferencesData.length > 0 && conferencesData[0].tracks?.length > 0) {
          setSelectedTrackId(conferencesData[0].tracks[0].id);
        }
      }
    };

    fetchConferencesAndTracks();
  }, []);

  const handleSaveSession = async () => {
    if (!sessionTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a session title.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTrackId) {
      toast({
        title: "Track Required",
        description: "Please select a conference track.",
        variant: "destructive",
      });
      return;
    }

    if (!recordedAudioBlob) {
      toast({
        title: "No Recording",
        description: "Please record audio before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        throw new Error("You must be logged in to save sessions");
      }

      // Upload audio to storage
      const fileName = `session-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, recordedAudioBlob, {
          contentType: 'audio/webm'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(fileName);

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          title: sessionTitle,
          description: sessionDescription || null,
          recording_url: publicUrl,
          track_id: selectedTrackId,
          status: 'completed',
          is_public: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      if (transcriptSegments.length > 0) {
        const segmentsToInsert = transcriptSegments.map(seg => ({
          session_id: session.id,
          text: seg.text,
          speaker_label: 'Speaker',
          start_time: seg.start || 0,
          end_time: seg.end || 0,
        }));

        await supabase.from('transcript_segments').insert(segmentsToInsert);
      }

      if (aiSummary) {
        await supabase.from('ai_insights').insert({
          session_id: session.id,
          insight_type: 'summary',
          content: aiSummary,
          confidence_score: 'high',
        });
      }

      setSavedSession({ id: session.id, title: sessionTitle });
      setShowSaveDialog(false);
      setShowQRDialog(true);

      toast({
        title: "Session Saved!",
        description: "Your session has been saved and is ready to share.",
      });
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save session.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
      accumulatedChunksRef.current = [];
      lastProcessedDurationRef.current = 0;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('Received audio chunk:', e.data.size, 'bytes');
          accumulatedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, processing final audio...');
        const audioBlob = new Blob(accumulatedChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        
        // Process any remaining audio that hasn't been transcribed yet
        if (accumulatedChunksRef.current.length > 0) {
          await processAccumulatedAudio(audioBlob, lastProcessedDurationRef.current);
        }
        
        setIsProcessing(false);
        
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
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
        }
      };

      // Start recording
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsAutoAnalyzing(true);

      // Set up interval to request data and transcribe every 30 seconds
      chunkIntervalRef.current = setInterval(async () => {
        if (recorder.state === 'recording') {
          console.log('Requesting data for 30-second transcription...');
          // Request data to trigger ondataavailable
          recorder.requestData();
          
          // Wait a bit for the data to be added to accumulatedChunksRef
          setTimeout(async () => {
            if (accumulatedChunksRef.current.length > 0) {
              const fullBlob = new Blob(accumulatedChunksRef.current, { type: 'audio/webm' });
              await processAccumulatedAudio(fullBlob, lastProcessedDurationRef.current);
            }
          }, 100);
        }
      }, 30000);

      toast({
        title: "Recording Started",
        description: "Auto-analysis enabled - summaries every 30 seconds",
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
      setIsAutoAnalyzing(false);
      setAudioLevel(0);
      
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
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
      setIsAutoAnalyzing(false);
      
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
      
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

  const downloadSummaryPDF = async () => {
    if (!aiSummary || !summaryRef.current) {
      toast({
        title: "No summary to download",
        description: "Please generate a summary first",
        variant: "destructive"
      });
      return;
    }

    try {
      const element = summaryRef.current;
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `session-summary-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "PDF Downloaded",
        description: "Summary has been saved as a PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Failed to download PDF",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(webm|mp4|mp3|wav|ogg|m4a)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file (webm, mp4, mp3, wav, ogg, m4a)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingFile(true);
    setIsProcessing(true);

    try {
      console.log(`Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      let data, error;
      
      // For files larger than 10MB, upload to storage first
      if (file.size > 10 * 1024 * 1024) {
        console.log('Large file detected, uploading to storage first...');
        
        // Upload to Supabase Storage
        const fileName = `temp-upload-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('session-recordings')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        console.log('File uploaded to storage, processing...');

        // Send storage path to transcription API
        const response = await supabase.functions.invoke('transcribe-audio', {
          body: { 
            storagePath: fileName,
            sessionId: 'upload-session',
            language: selectedLanguage === 'auto' ? undefined : selectedLanguage
          }
        });

        data = response.data;
        error = response.error;

        // Clean up the temporary file
        await supabase.storage
          .from('session-recordings')
          .remove([fileName]);
          
      } else {
        // For smaller files, use base64 approach
        console.log('Small file, using direct upload...');
        
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        const response = await supabase.functions.invoke('transcribe-audio', {
          body: { 
            audio: base64Audio,
            sessionId: 'upload-session',
            language: selectedLanguage === 'auto' ? undefined : selectedLanguage
          }
        });

        data = response.data;
        error = response.error;
      }

      if (error) throw error;

      if (data.segments && data.segments.length > 0) {
        const newSegments: TranscriptSegment[] = data.segments.map((seg: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          text: seg.text,
          timestamp: new Date(seg.start * 1000).toISOString().substr(14, 5),
          confidence: seg.confidence,
          start: seg.start,
          end: seg.end,
        }));
        
        setTranscriptSegments(newSegments);
        
        if (data.averageConfidence !== null) {
          setAverageConfidence(data.averageConfidence);
        }
        
        // Store the uploaded file as recordedAudioBlob to enable saving
        setRecordedAudioBlob(file);
        
        toast({
          title: "Transcription complete",
          description: `Processed ${file.name} successfully. Language: ${data.language || 'Unknown'}`,
        });
      } else if (data.text) {
        const newSegment: TranscriptSegment = {
          id: Date.now().toString(),
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setTranscriptSegments([newSegment]);
        
        // Store the uploaded file as recordedAudioBlob to enable saving
        setRecordedAudioBlob(file);
        
        toast({
          title: "Transcription complete",
          description: `Processed ${file.name} successfully`,
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process audio file",
        variant: "destructive"
      });
    } finally {
      setIsUploadingFile(false);
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const playAudio = async () => {
    if (!audioRef.current || !recordedAudioBlob) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // Create a new blob URL each time we play
        const blobUrl = URL.createObjectURL(recordedAudioBlob);
        audioRef.current.src = blobUrl;
        
        // Wait for audio to load before playing
        audioRef.current.load();
        
        await audioRef.current.play();
        setIsPlaying(true);
        
        toast({
          title: "Playing Recording",
          description: `Duration: ${formatTime(duration)}`,
        });
      } catch (error: any) {
        console.error("Error playing audio:", error);
        toast({
          title: "Playback Error",
          description: error.message || "Failed to play audio.",
          variant: "destructive",
        });
        setIsPlaying(false);
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

  const processAccumulatedAudio = async (audioBlob: Blob, lastDuration: number) => {
    try {
      console.log(`Transcribing accumulated audio (last duration: ${lastDuration}s)...`);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
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
                sessionId: 'test-session-incremental',
                language: selectedLanguage === 'auto' ? undefined : selectedLanguage,
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Incremental transcription failed:', response.status, errorText);
            return;
          }

          const data = await response.json();
          console.log('Transcription response:', data);
          
          if (data.segments && data.segments.length > 0) {
            // Only add segments that are NEW (after the last transcribed duration)
            const newSegments: TranscriptSegment[] = data.segments
              .filter((seg: any) => seg.start >= lastDuration)
              .map((seg: any, index: number) => ({
                id: `${Date.now()}-${index}-${Math.random()}`,
                text: seg.text,
                timestamp: new Date(seg.start * 1000).toISOString().substr(14, 5),
                confidence: seg.confidence,
                start: seg.start,
                end: seg.end,
              }));
            
            if (newSegments.length > 0) {
              setTranscriptSegments(prev => [...prev, ...newSegments]);
              console.log(`Added ${newSegments.length} new transcript segments`);
              
              // Update the last processed duration to the end of the last segment
              const lastSegment = data.segments[data.segments.length - 1];
              lastProcessedDurationRef.current = lastSegment.end;
              console.log(`Updated last processed duration to ${lastSegment.end}s`);
              
              // Generate rolling summary after adding new segments
              await generateRollingSummary();
            } else {
              console.log('No new segments to add (all already transcribed)');
            }
          } else if (data.text) {
            const newSegment: TranscriptSegment = {
              id: `${Date.now()}-${Math.random()}`,
              text: data.text,
              timestamp: new Date().toLocaleTimeString(),
            };
            
            setTranscriptSegments(prev => [...prev, newSegment]);
            console.log('Added transcript segment');
            
            // Generate rolling summary after adding new segment
            await generateRollingSummary();
          }
        } catch (err) {
          console.error('Error in incremental processing:', err);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error: any) {
      console.error('Accumulated audio processing error:', error);
    }
  };

  const generateRollingSummary = async () => {
    if (transcriptSegments.length === 0) return;

    try {
      const fullTranscript = transcriptSegments.map(s => s.text).join(' ');
      
      console.log('Generating rolling summary...');
      
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { transcript: fullTranscript }
      });

      if (error) {
        console.error('Rolling summary error:', error);
        return;
      }

      if (data?.summary) {
        const timestamp = new Date().toLocaleTimeString();
        setRollingSummaries(prev => [...prev, { timestamp, summary: data.summary }]);
        
        console.log(`Rolling summary generated at ${timestamp}`);
      }
    } catch (error) {
      console.error('Error generating rolling summary:', error);
    }
  };

  const clearTranscript = () => {
    setTranscriptSegments([]);
    setAverageConfidence(null);
    setRollingSummaries([]);
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
              Audio Recording & Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload Section */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.webm,.mp4,.mp3,.wav,.ogg,.m4a"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-file-upload"
              />
              <label htmlFor="audio-file-upload">
                <Button 
                  variant="outline"
                  disabled={isRecording || isUploadingFile}
                  asChild
                >
                  <span className="cursor-pointer">
                    {isUploadingFile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Audio File
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-sm text-muted-foreground">
                Upload a previous recording to transcribe and analyze (max 25MB)
              </p>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-4 flex-wrap">{!isRecording && !isProcessing && (
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
                  {rollingSummaries.length > 0 && (
                    <Button
                      onClick={() => {
                        const element = document.getElementById('rolling-summaries');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          toast({
                            title: "Latest Summary",
                            description: `Last updated at ${rollingSummaries[rollingSummaries.length - 1].timestamp}`,
                          });
                        }
                      }}
                      size="lg"
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-5 w-5" />
                      Catch Me Up
                    </Button>
                  )}
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

              <div className="space-y-4">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={(value) => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = value[0];
                      setCurrentTime(value[0]);
                    }
                  }}
                  className="cursor-pointer"
                />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Playback Speed:</span>
                  <div className="flex gap-2">
                    {[0.5, 1, 1.5, 2].map((rate) => (
                      <Button
                        key={rate}
                        variant={playbackRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (audioRef.current) {
                            audioRef.current.playbackRate = rate;
                          }
                        }}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Session Card - Shows after recording is complete */}
        {recordedAudioBlob && !savedSession && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Save This Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{transcriptSegments.length}</div>
                    <div className="text-xs text-muted-foreground">Segments</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{aiSummary ? "✓" : "–"}</div>
                    <div className="text-xs text-muted-foreground">AI Summary</div>
                  </div>
                </div>
                <Button onClick={() => setShowSaveDialog(true)} className="w-full" size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  Save & Share Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Session Card - Shows after session is saved */}
        {savedSession && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Session Saved!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your session "{savedSession.title}" has been saved and is ready to share.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowQRDialog(true)} 
                    variant="outline"
                    className="flex-1"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    View QR Code
                  </Button>
                  <Button 
                    onClick={() => navigate(`/session/${savedSession.id}/replay`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Session
                  </Button>
                  <Button 
                    onClick={() => navigate('/recorded-sessions')}
                    className="flex-1"
                  >
                    All Sessions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rolling Summaries - Shows real-time summaries during recording */}
        {rollingSummaries.length > 0 && (
          <Card id="rolling-summaries">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Real-Time Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Auto-generated summaries every 30 seconds</p>
              </div>
              {isAutoAnalyzing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Analyzing
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...rollingSummaries].reverse().map((item, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${
                      index === 0 
                        ? 'bg-primary/5 border-primary' 
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={index === 0 ? "default" : "outline"} className="text-xs">
                        {index === 0 ? 'Latest' : item.timestamp}
                      </Badge>
                      {index === 0 && (
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-sm">{item.summary}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {transcriptSegments.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>AI Summary</CardTitle>
              <div className="flex items-center gap-2">
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
                {aiSummary && (
                  <Button 
                    onClick={downloadSummaryPDF}
                    variant="outline"
                    size="sm"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {aiSummary ? (
                <div className="bg-background shadow-lg rounded-lg overflow-hidden">
                  <div 
                    ref={summaryRef}
                    className="p-8 md:p-12 max-h-[600px] overflow-y-auto"
                  >
                    <div className="prose prose-slate dark:prose-invert max-w-none
                      prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-0
                      prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                      prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                      prose-p:my-4 prose-p:leading-7
                      prose-ul:my-4 prose-li:my-1
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
                      prose-hr:my-8 prose-hr:border-border">
                      <div className="whitespace-pre-wrap">{aiSummary}</div>
                    </div>
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

      {/* Save Session Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Session</DialogTitle>
            <DialogDescription>
              Save this session to make it accessible to others with a shareable link and QR code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Product Launch Discussion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="track">Conference Track *</Label>
              <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
                <SelectTrigger id="track">
                  <SelectValue placeholder="Select a conference track" />
                </SelectTrigger>
                <SelectContent>
                  {conferences.map((conference) => (
                    <div key={conference.id}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        {conference.name}
                      </div>
                      {conference.tracks?.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                  {conferences.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No conferences available. Create one first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                placeholder="Brief description of what was discussed..."
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recording Duration:</span>
                <span className="font-medium">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transcript Segments:</span>
                <span className="font-medium">{transcriptSegments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Summary:</span>
                <span className="font-medium">{aiSummary ? "Included" : "Not generated"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSaveDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSession}
                className="flex-1"
                disabled={isSaving || !sessionTitle.trim() || !selectedTrackId}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {savedSession && (
        <QRCodeDialog
          session={savedSession}
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
        />
      )}
    </div>
  );
}
