import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@/hooks/useUserRole";

export const DevRoleToggle = () => {
  const [selectedRole, setSelectedRole] = useState<string>("none");

  useEffect(() => {
    const stored = localStorage.getItem('dev_role_override');
    setSelectedRole(stored || "none");
  }, []);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    if (value === "none") {
      localStorage.removeItem('dev_role_override');
    } else {
      localStorage.setItem('dev_role_override', value);
    }
    // Reload to apply changes
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-dashed border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20"
        >
          <Settings className="h-4 w-4" />
          Dev Mode
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Override Role (Dev Only)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedRole} onValueChange={handleRoleChange}>
          <DropdownMenuRadioItem value="none">
            Use Actual Role
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="admin">
            Admin
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="organizer">
            Organizer
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="speaker">
            Speaker
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="attendee">
            Attendee
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
