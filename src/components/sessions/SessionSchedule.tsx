import { SessionCard } from "./SessionCard";

interface Session {
  id: string;
  title: string;
  description: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  track_id: string;
}

interface Track {
  id: string;
  name: string;
}

interface SessionScheduleProps {
  sessions: Session[];
  tracks: Track[];
  onEdit: (session: Session) => void;
  onDelete: (id: string) => void;
  onGenerateQR: (session: Session) => void;
}

export const SessionSchedule = ({
  sessions,
  tracks,
  onEdit,
  onDelete,
  onGenerateQR,
}: SessionScheduleProps) => {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Create tracks first to add sessions
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No sessions yet. Create your first session to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {tracks.map((track) => {
        const trackSessions = sessions.filter((s) => s.track_id === track.id);
        
        if (trackSessions.length === 0) return null;

        return (
          <div key={track.id}>
            <h3 className="text-xl font-bold mb-4">{track.name}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trackSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onGenerateQR={onGenerateQR}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
