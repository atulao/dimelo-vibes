import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateConferenceDialog } from "@/components/conferences/CreateConferenceDialog";
import { ConferenceCard } from "@/components/conferences/ConferenceCard";

const Conferences = () => {
  const { user, loading: authLoading } = useAuth();
  const [conferences, setConferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConferences();
    }
  }, [user]);

  const fetchConferences = async () => {
    try {
      setLoading(true);

      // First get user's organizations
      const { data: userOrgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user?.id);

      if (orgsError) throw orgsError;

      const orgIds = userOrgs?.map((org) => org.id) || [];

      if (orgIds.length === 0) {
        setConferences([]);
        setLoading(false);
        return;
      }

      // Then get conferences from those organizations
      const { data, error } = await supabase
        .from("conferences")
        .select("*")
        .in("organization_id", orgIds)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setConferences(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Conferences</h1>
            <p className="text-muted-foreground">View and manage your conferences</p>
          </div>
          <CreateConferenceDialog onSuccess={fetchConferences} />
        </div>

        {conferences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No conferences yet. Create your first conference to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {conferences.map((conference) => (
              <ConferenceCard key={conference.id} conference={conference} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conferences;
