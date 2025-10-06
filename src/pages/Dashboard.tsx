import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Users, 
  Building2, 
  Mic, 
  TrendingUp,
  Plus,
  ArrowRight
} from "lucide-react";
import { Navigation } from "@/components/Navigation";

const Dashboard = () => {
  const { role, loading: roleLoading, user } = useUserRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !user) {
      navigate("/auth");
      return;
    }

    if (role && !roleLoading) {
      console.log("Fetching dashboard data for role:", role);
      fetchDashboardData();
    } else if (!roleLoading && role === null) {
      console.log("Role is null after loading");
      setLoading(false);
    }
  }, [role, roleLoading, user]);

  const fetchDashboardData = async () => {
    try {
      switch (role) {
        case "admin":
          await fetchAdminStats();
          break;
        case "organizer":
          await fetchOrganizerData();
          break;
        case "speaker":
          await fetchSpeakerData();
          break;
        case "attendee":
          await fetchAttendeeData();
          break;
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    const [
      { count: conferenceCount },
      { count: sessionCount },
      { count: orgCount }
    ] = await Promise.all([
      supabase.from("conferences").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("organizations").select("*", { count: "exact", head: true })
    ]);

    setStats({
      conferences: conferenceCount || 0,
      sessions: sessionCount || 0,
      organizations: orgCount || 0,
    });
  };

  const fetchOrganizerData = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user?.id);

    const orgIds = roles?.map(r => r.organization_id).filter(Boolean) || [];

    if (orgIds.length === 0) {
      setStats({ conferences: [] });
      return;
    }

    const { data: conferences } = await supabase
      .from("conferences")
      .select(`
        *,
        tracks (
          id,
          sessions (id)
        )
      `)
      .in("organization_id", orgIds)
      .order("start_date", { ascending: true })
      .limit(5);

    setStats({ conferences: conferences || [] });
  };

  const fetchSpeakerData = async () => {
    const { data: sessions } = await supabase
      .from("sessions")
      .select(`
        *,
        tracks (
          name,
          conferences (name, location)
        )
      `)
      .eq("speaker_email", user?.email)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5);

    setStats({ sessions: sessions || [] });
  };

  const fetchAttendeeData = async () => {
    const { data: conferences } = await supabase
      .from("conferences")
      .select("*")
      .eq("is_active", true)
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(6);

    setStats({ conferences: conferences || [] });
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // If no role is assigned (shouldn't happen, but handle it)
  if (!role) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to ConferenceAI</h3>
              <p className="text-muted-foreground mb-4">
                Your account is being set up. Please refresh the page or browse conferences.
              </p>
              <Button onClick={() => navigate("/browse")}>
                Browse Conferences
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderAdminDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conferences</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conferences || 0}</div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sessions || 0}</div>
            <p className="text-xs text-muted-foreground">Live and scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.organizations || 0}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" onClick={() => navigate("/organizations")}>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Organizations
            </Button>
            <Button className="w-full justify-start" onClick={() => navigate("/conferences")}>
              <Calendar className="mr-2 h-4 w-4" />
              View All Conferences
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Platform activity summary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The platform is running smoothly with {stats?.conferences} active conferences
              and {stats?.sessions} scheduled sessions.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderOrganizerDashboard = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">My Conferences</h2>
          <p className="text-muted-foreground">Manage your conference events</p>
        </div>
        <Button onClick={() => navigate("/organizations")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Conference
        </Button>
      </div>

      {stats?.conferences?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conferences yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first conference
            </p>
            <Button onClick={() => navigate("/organizations")}>
              Create Conference
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats?.conferences?.map((conf: any) => (
            <Card key={conf.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{conf.name}</CardTitle>
                <CardDescription>
                  {conf.location} • {new Date(conf.start_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {conf.tracks?.reduce((acc: number, t: any) => acc + (t.sessions?.length || 0), 0) || 0} sessions
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/conferences/${conf.id}`)}>
                    View
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderSpeakerDashboard = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Upcoming Sessions</h2>
          <p className="text-muted-foreground">Your scheduled speaking sessions</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/speaker/sessions")}>
          View All Sessions
        </Button>
      </div>

      {stats?.sessions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mic className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming sessions</h3>
            <p className="text-muted-foreground">
              You don't have any scheduled sessions at the moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stats?.sessions?.map((session: any) => (
            <Card key={session.id}>
              <CardHeader>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>
                  {session.tracks?.conferences?.name} • {session.tracks?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {new Date(session.start_time).toLocaleString()}
                  </div>
                  <Button size="sm" onClick={() => navigate(`/session/${session.id}`)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderAttendeeDashboard = () => (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Discover Conferences</h2>
        <p className="text-muted-foreground">Explore upcoming conferences and sessions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats?.conferences?.slice(0, 6).map((conf: any) => (
          <Card key={conf.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="line-clamp-2">{conf.name}</CardTitle>
              <CardDescription>
                {conf.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {new Date(conf.start_date).toLocaleDateString()} - {new Date(conf.end_date).toLocaleDateString()}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate("/browse")}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Browse All Conferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Discover more conferences and register for sessions that interest you
          </p>
          <Button onClick={() => navigate("/browse")}>
            Browse Conferences
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        {role === "admin" && renderAdminDashboard()}
        {role === "organizer" && renderOrganizerDashboard()}
        {role === "speaker" && renderSpeakerDashboard()}
        {role === "attendee" && renderAttendeeDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
