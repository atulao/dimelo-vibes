import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

interface AttendeeListProps {
  sessionId: string;
  canViewList: boolean;
}

export const AttendeeList = ({ sessionId, canViewList }: AttendeeListProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!canViewList) return;

    fetchAttendees();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('attendee-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_attendees',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchAttendees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, canViewList]);

  const fetchAttendees = async () => {
    try {
      // First fetch attendees
      const { data: attendeeData, error: attendeeError } = await supabase
        .from("session_attendees")
        .select("id, user_id, joined_at, left_at")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: false });

      if (attendeeError) throw attendeeError;

      if (!attendeeData || attendeeData.length === 0) {
        setAttendees([]);
        setActiveCount(0);
        return;
      }

      // Fetch profiles for all users
      const userIds = attendeeData.map(a => a.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const mergedData = attendeeData.map(attendee => ({
        ...attendee,
        profiles: profilesData?.find(p => p.id === attendee.user_id) || null
      }));

      setAttendees(mergedData);
      
      // Count active attendees (not left)
      const active = mergedData.filter(a => !a.left_at).length;
      setActiveCount(active);
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Name', 'Email', 'Joined At', 'Left At', 'Duration (minutes)'],
      ...attendees.map(attendee => {
        const joinedAt = new Date(attendee.joined_at);
        const leftAt = attendee.left_at ? new Date(attendee.left_at) : new Date();
        const duration = Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000);
        
        return [
          attendee.profiles?.full_name || 'Anonymous',
          attendee.profiles?.email || 'N/A',
          joinedAt.toLocaleString(),
          attendee.left_at ? leftAt.toLocaleString() : 'Still Active',
          duration.toString()
        ];
      })
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-attendees-${sessionId}.csv`;
    a.click();

    toast({
      title: "Export Complete",
      description: "Attendee list has been downloaded.",
    });
  };

  if (!canViewList) {
    return null;
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees ({activeCount} active)
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={exportToCSV}
            disabled={attendees.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No attendees yet
            </p>
          ) : (
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        attendee.profiles?.full_name || null,
                        attendee.profiles?.email || 'A'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attendee.profiles?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {attendee.profiles?.email}
                    </p>
                  </div>
                  {!attendee.left_at && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
