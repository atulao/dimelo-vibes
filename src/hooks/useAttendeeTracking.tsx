import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAttendeeTracking = (sessionId: string, userId: string | undefined) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [attendeeId, setAttendeeId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Check if user has already joined
    checkExistingAttendance();

    // Cleanup: mark as left when component unmounts
    return () => {
      if (attendeeId) {
        markAsLeft();
      }
    };
  }, [sessionId, userId]);

  const checkExistingAttendance = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("session_attendees")
        .select("id, left_at")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAttendeeId(data.id);
        // If they previously joined but left, rejoin them
        if (data.left_at) {
          await rejoinSession(data.id);
        } else {
          setHasJoined(true);
        }
      }
    } catch (error) {
      console.error("Error checking attendance:", error);
    }
  };

  const joinSession = async () => {
    if (!userId || hasJoined) return;

    try {
      const { data, error } = await supabase
        .from("session_attendees")
        .insert({
          session_id: sessionId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setAttendeeId(data.id);
      setHasJoined(true);
      
      toast({
        title: "Joined Session",
        description: "You're now viewing this live session.",
      });
    } catch (error: any) {
      console.error("Error joining session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join session",
        variant: "destructive",
      });
    }
  };

  const rejoinSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from("session_attendees")
        .update({ left_at: null })
        .eq("id", id);

      if (error) throw error;

      setHasJoined(true);
    } catch (error) {
      console.error("Error rejoining session:", error);
    }
  };

  const markAsLeft = async () => {
    if (!attendeeId) return;

    try {
      await supabase
        .from("session_attendees")
        .update({ left_at: new Date().toISOString() })
        .eq("id", attendeeId);
    } catch (error) {
      console.error("Error marking as left:", error);
    }
  };

  return {
    hasJoined,
    joinSession,
    markAsLeft,
  };
};
