import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Presentation } from "lucide-react";

interface Track {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  session_count?: number;
}

interface TrackCardProps {
  track: Track;
  onEdit: (track: Track) => void;
  onDelete: (id: string) => void;
}

export const TrackCard = ({ track, onEdit, onDelete }: TrackCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Presentation className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{track.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-1">
                  {track.session_count || 0} sessions
                </Badge>
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(track)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(track.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {track.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{track.description}</p>
        </CardContent>
      )}
    </Card>
  );
};
