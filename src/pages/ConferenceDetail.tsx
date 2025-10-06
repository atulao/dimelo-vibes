import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, ArrowLeft } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";

const ConferenceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conference, setConference] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user && id) {
      fetchConference();
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
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold">{conference.name}</h1>
            <Badge className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          <div className="space-y-2 text-muted-foreground">
            {conference.organizations && (
              <p className="text-sm">
                Organized by <span className="font-medium">{conference.organizations.name}</span>
              </p>
            )}
            {conference.start_date && conference.end_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(conference.start_date), "MMMM d, yyyy")} -{" "}
                  {format(new Date(conference.end_date), "MMMM d, yyyy")}
                </span>
              </div>
            )}
            {conference.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{conference.location}</span>
              </div>
            )}
          </div>

          {conference.description && (
            <p className="mt-4 text-lg">{conference.description}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tracks</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and manage conference tracks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Schedule and manage sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View engagement and insights
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConferenceDetail;
