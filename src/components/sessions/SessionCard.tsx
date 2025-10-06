import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Clock, MapPin, User, QrCode } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";

interface Session {
  id: string;
  title: string;
  description: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

interface SessionCardProps {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (id: string) => void;
  onGenerateQR: (session: Session) => void;
}

export const SessionCard = ({ session, onEdit, onDelete, onGenerateQR }: SessionCardProps) => {
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
