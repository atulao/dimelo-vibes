import { Link, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  Mic, 
  Search,
  Settings,
  User,
  LogOut,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";

export const Navigation = () => {
  const { role, user, loading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold">
              ConferenceAI
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const menuItems = {
    admin: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Organizations", icon: Building2, path: "/organizations" },
      { label: "Conferences", icon: Calendar, path: "/conferences" },
      { label: "Browse", icon: Search, path: "/browse" },
    ],
    organizer: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "My Conferences", icon: Calendar, path: "/conferences" },
      { label: "Organizations", icon: Building2, path: "/organizations" },
      { label: "Browse", icon: Search, path: "/browse" },
    ],
    speaker: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "My Sessions", icon: Mic, path: "/speaker/sessions" },
      { label: "Browse", icon: Search, path: "/browse" },
    ],
    attendee: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Browse", icon: Search, path: "/browse" },
    ],
  };

  const items = role ? menuItems[role] : menuItems.attendee;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "organizer":
        return "default";
      case "speaker":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold">
              ConferenceAI
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-4">
                {items.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link to={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <>
                {/* <GlobalSearch /> */}
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/browse">Browse Conferences</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </>
            ) : (
              <>
                {/* <GlobalSearch /> */}
                <NotificationBell userId={user?.id} />
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {role && (
                        <Badge variant={getRoleBadgeVariant(role)} className="w-fit mt-2">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Mobile menu items */}
                  <div className="md:hidden">
                    {items.map((item) => (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link to={item.path} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
