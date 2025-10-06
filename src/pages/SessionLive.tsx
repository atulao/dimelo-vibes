import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { TranscriptDisplay } from "@/components/session/TranscriptDisplay";
import { AIInsightsPanel } from "@/components/session/AIInsightsPanel";
import { QASection } from "@/components/session/QASection";

const SessionLive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          tracks (
            name,
            conferences (name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate(`/session/${id}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/session/${id}`)}
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500 animate-pulse">🔴 LIVE</Badge>
              <div className="text-sm text-right">
                <p className="font-semibold">{session.title}</p>
                <p className="text-muted-foreground">
                  {session.tracks?.conferences?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6 h-[calc(100vh-12rem)]">
          {/* Left: Transcript (2 columns) */}
          <div className="lg:col-span-2">
            <TranscriptDisplay sessionId={id!} />
          </div>

          {/* Right: AI Insights + Q&A (1 column) */}
          <div className="space-y-6 overflow-y-auto">
            <AIInsightsPanel sessionId={id!} />
            <QASection sessionId={id!} />
          </div>
        </div>

        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-6">
          {/* Transcript */}
          <div className="h-[50vh]">
            <TranscriptDisplay sessionId={id!} />
          </div>

          {/* AI Insights */}
          <AIInsightsPanel sessionId={id!} />

          {/* Q&A */}
          <QASection sessionId={id!} />
        </div>
      </div>
    </div>
  );
};

export default SessionLive;
