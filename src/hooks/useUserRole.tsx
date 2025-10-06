import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "organizer" | "speaker" | "attendee" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Dev mode override - only works in development builds
  const devRoleOverride = import.meta.env.DEV 
    ? localStorage.getItem('dev_role_override') as UserRole 
    : null;

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Check for roles in user_roles table
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);

      if (error) throw error;

      // Priority: admin > organizer > speaker > attendee (default)
      if (userRoles?.some(r => r.role === "admin")) {
        setRole("admin");
      } else if (userRoles?.some(r => r.role === "organizer")) {
        setRole("organizer");
      } else {
        // Check if user is a speaker by looking at sessions
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id")
          .eq("speaker_email", authUser.email)
          .limit(1);

        if (sessions && sessions.length > 0) {
          setRole("speaker");
        } else {
          setRole("attendee");
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching user role:", error);
      }
      setRole("attendee"); // Default to attendee on error
    } finally {
      setLoading(false);
    }
  };

  // Return dev override if set, otherwise return actual role
  const effectiveRole = devRoleOverride || role;
  
  return { role: effectiveRole, loading, user, refetch: fetchUserRole };
};
