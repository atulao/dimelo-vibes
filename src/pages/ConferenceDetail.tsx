import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, ArrowLeft, Edit, Building } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";
import { UpdateConferenceDialog } from "@/components/conferences/UpdateConferenceDialog";
import { CreateTrackDialog } from "@/components/tracks/CreateTrackDialog";
import { TrackCard } from "@/components/tracks/TrackCard";
import { EditTrackDialog } from "@/components/tracks/EditTrackDialog";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { EditSessionDialog } from "@/components/sessions/EditSessionDialog";
import { SessionSchedule } from "@/components/sessions/SessionSchedule";
import { QRCodeDialog } from "@/components/sessions/QRCodeDialog";

const ConferenceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conference, setConference] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editConferenceOpen, setEditConferenceOpen] = useState(false);
  const [editTrack, setEditTrack] = useState<any>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<any>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [qrSession, setQrSession] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && id) {
      fetchConference();
      fetchTracks();
      fetchSessions();
    }
  }, [user, id]);

  const fetchConference = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conferences")
        .select("*, organizations(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setConference(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/conferences");
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select("*, sessions(count)")
        .eq("conference_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tracksWithCount = data?.map((track) => ({
        ...track,
        session_count: track.sessions?.[0]?.count || 0,
      }));

      setTracks(tracksWithCount || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, tracks(conference_id), recording_url")
        .eq("tracks.conference_id", id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      // Filter out sessions where tracks is null (tracks that don't belong to this conference)
      const filteredSessions = data?.filter(session => session.tracks !== null) || [];
      setSessions(filteredSessions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTrack = async () => {
    if (!deleteTrackId) return;

    try {
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", deleteTrackId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Track deleted successfully",
      });

      fetchTracks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteTrackId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;

    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", deleteSessionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session deleted successfully",
      });

      fetchSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteSessionId(null);
    }
  };

  const getStatus = () => {
    if (!conference?.start_date || !conference?.end_date) return "upcoming";

    const now = new Date();
    const start = new Date(conference.start_date);
    const end = new Date(conference.end_date);

    if (isBefore(now, start)) return "upcoming";
    if (isAfter(now, end)) return "past";
    return "active";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!conference) return null;

  const status = getStatus();
  const statusColors = {
    upcoming: "bg-blue-500",
    active: "bg-green-500",
    past: "bg-gray-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/conferences")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conferences
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">{conference.name}</h1>
              <Badge className={statusColors[status]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <Button onClick={() => setEditConferenceOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Conference
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Conference Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conference.organizations && (
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Organization</p>
                      <p className="text-sm text-muted-foreground">
                        {conference.organizations.name}
                      </p>
                    </div>
                  </div>
                )}
                {conference.start_date && conference.end_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dates</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(conference.start_date), "MMMM d, yyyy")} -{" "}
                        {format(new Date(conference.end_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {conference.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{conference.location}</p>
                    </div>
                  </div>
                )}
                {conference.description && (
                  <div>
                    <p className="text-sm font-medium mb-2">Description</p>
                    <p className="text-sm text-muted-foreground">{conference.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracks" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">Conference Tracks</h3>
                <p className="text-muted-foreground">Organize sessions into tracks</p>
              </div>
              <CreateTrackDialog conferenceId={id!} onSuccess={fetchTracks} />
            </div>

            {tracks.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Tracks Yet</CardTitle>
                  <CardDescription>
                    Create your first track to organize sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tracks help you organize multiple parallel sessions at your conference.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onEdit={setEditTrack}
                    onDelete={setDeleteTrackId}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">Conference Sessions</h3>
                <p className="text-muted-foreground">Manage your conference schedule</p>
              </div>
              <CreateSessionDialog conferenceId={id!} onSuccess={fetchSessions} />
            </div>

            <SessionSchedule
              sessions={sessions}
              tracks={tracks}
              onEdit={setEditSession}
              onDelete={setDeleteSessionId}
              onGenerateQR={setQrSession}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Conference Settings</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Advanced conference settings will be available here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <UpdateConferenceDialog
          conference={conference}
          open={editConferenceOpen}
          onOpenChange={setEditConferenceOpen}
          onSuccess={fetchConference}
        />

        <EditTrackDialog
          track={editTrack}
          open={!!editTrack}
          onOpenChange={(open) => !open && setEditTrack(null)}
          onSuccess={fetchTracks}
        />

        <EditSessionDialog
          session={editSession}
          conferenceId={id!}
          open={!!editSession}
          onOpenChange={(open) => !open && setEditSession(null)}
          onSuccess={fetchSessions}
        />

        <QRCodeDialog
          session={qrSession}
          open={!!qrSession}
          onOpenChange={(open) => !open && setQrSession(null)}
        />

        <AlertDialog open={!!deleteTrackId} onOpenChange={() => setDeleteTrackId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this track and all associated sessions.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTrack}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this session. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ConferenceDetail;
