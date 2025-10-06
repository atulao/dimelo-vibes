import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecordingSettingsProps {
  sessionId: string;
}

export const RecordingSettings = ({ sessionId }: RecordingSettingsProps) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState<'browser' | 'whisper'>('browser');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTesting, setIsTesting] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    loadSettings();
    loadAudioDevices();
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [sessionId]);

  const loadSettings = async () => {
    const { data: session } = await supabase
      .from('sessions')
      .select('transcription_provider, transcription_settings')
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
    }
  };

  const loadAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
      
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error accessing audio devices:', error);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to configure audio settings.",
        variant: "destructive",
      });
    }
  };

  const testAudio = async () => {
    if (isTesting) {
      // Stop testing
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setIsTesting(false);
      setAudioLevel(0);
      return;
    }

    try {
      setIsTesting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!isTesting) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 128) * 100));
        
        requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      setAudioContext(context);
      
      toast({
        title: "Testing Audio",
        description: "Speak into your microphone to see the level indicator.",
      });
    } catch (error) {
      console.error('Error testing audio:', error);
      setIsTesting(false);
      toast({
        title: "Test Failed",
        description: "Could not access the selected microphone.",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          transcription_provider: provider,
          transcription_settings: {
            selectedDevice,
          }
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Recording settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Could not save recording settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Recording Settings
        </CardTitle>
        <CardDescription>
          Configure transcription provider and audio input
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transcription Provider */}
        <div className="space-y-2">
          <Label htmlFor="provider">Transcription Provider</Label>
          <Select value={provider} onValueChange={(value: 'browser' | 'whisper') => setProvider(value)}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">
                Browser (Free)
                <Badge variant="outline" className="ml-2">Chrome/Edge</Badge>
              </SelectItem>
              <SelectItem value="whisper">
                OpenAI Whisper (Premium)
                <Badge variant="outline" className="ml-2">Higher Accuracy</Badge>
              </SelectItem>
            </SelectContent>
          </Select>
          {provider === 'browser' && (
            <p className="text-xs text-muted-foreground">
              Free speech recognition. Chrome or Edge required, internet connection needed.
            </p>
          )}
          {provider === 'whisper' && (
            <p className="text-xs text-muted-foreground">
              Industry-leading accuracy with OpenAI Whisper. Better for technical terms and multiple languages.
            </p>
          )}
        </div>

        {/* Microphone Selection */}
        <div className="space-y-2">
          <Label htmlFor="microphone">Microphone</Label>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger id="microphone">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audio Test */}
        <div className="space-y-2">
          <Label>Audio Level Test</Label>
          <div className="flex items-center gap-3">
            <Button
              variant={isTesting ? "destructive" : "outline"}
              size="sm"
              onClick={testAudio}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isTesting ? "Stop Test" : "Test Audio"}
            </Button>
            {isTesting && (
              <div className="flex-1">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {isTesting && (
            <p className="text-xs text-muted-foreground">
              Speak into your microphone to see the level indicator move
            </p>
          )}
        </div>

        <Button onClick={saveSettings} className="w-full">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
