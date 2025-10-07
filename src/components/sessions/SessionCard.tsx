import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Edit, Trash2, Clock, MapPin, User, QrCode, Play, Pause } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";
import { useRef, useState, useEffect } from "react";

interface Session {
  id: string;
  title: string;
  description: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  recording_url?: string | null;
}

interface SessionCardProps {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (id: string) => void;
  onGenerateQR: (session: Session) => void;
}

export const SessionCard = ({ session, onEdit, onDelete, onGenerateQR }: SessionCardProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!session.recording_url) return;

    console.log('Setting up audio listeners for:', session.title);

    const handleTimeUpdate = () => {
      console.log('Time update:', audio.currentTime);
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      console.log('Metadata loaded, duration:', audio.duration);
      setDuration(audio.duration);
    };
    
    const handleEnded = () => setIsPlaying(false);

    const handleError = (e: Event) => {
      console.error('Audio error for', session.title, e);
    };

    const handleCanPlay = () => {
      console.log('Can play, duration:', audio.duration);
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Force load metadata
    audio.load();

    // If metadata is already loaded, set duration immediately
    if (audio.readyState >= 1 && audio.duration && audio.duration !== Infinity) {
      console.log('Metadata already loaded:', audio.duration);
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [session.recording_url, session.title]);

  const getStatus = () => {
    if (!session.start_time || !session.end_time) return session.status;

    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);

    if (isBefore(now, start)) return "scheduled";
    if (isAfter(now, end)) return "completed";
    return "live";
  };

  const status = getStatus();

  const statusColors = {
    scheduled: "bg-blue-500",
    live: "bg-green-500",
    completed: "bg-gray-500",
    draft: "bg-yellow-500",
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{session.title}</CardTitle>
              <Badge className={statusColors[status as keyof typeof statusColors]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {session.description && (
              <CardDescription className="line-clamp-2">
                {session.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {session.start_time && session.end_time && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(session.start_time), "MMM d, h:mm a")} -{" "}
                {format(new Date(session.end_time), "h:mm a")}
              </span>
            </div>
          )}
          {session.speaker_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{session.speaker_name}</span>
            </div>
          )}

          {session.recording_url && (
            <div className="space-y-3 pt-3 border-t">
              <audio ref={audioRef} src={session.recording_url} preload="metadata" />
              
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={togglePlayPause}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <div className="flex gap-1">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <Button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      variant={playbackRate === rate ? "default" : "outline"}
                      size="sm"
                      className="px-2"
                    >
                      {rate}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateQR(session)}
              className="flex-1"
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(session)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
