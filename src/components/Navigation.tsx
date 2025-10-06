import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Navigation = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold">Dímelo</h1>
            <div className="hidden md:flex gap-4">
              <Button variant="ghost" onClick={() => navigate("/")}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => navigate("/organizations")}>
                Organizations
              </Button>
              <Button variant="ghost" onClick={() => navigate("/conferences")}>
                Conferences
              </Button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-4 mt-8">
                <Button variant="ghost" onClick={() => { navigate("/"); setOpen(false); }}>
                  Home
                </Button>
                <Button variant="ghost" onClick={() => { navigate("/organizations"); setOpen(false); }}>
                  Organizations
                </Button>
                <Button variant="ghost" onClick={() => { navigate("/conferences"); setOpen(false); }}>
                  Conferences
                </Button>
                <Button variant="ghost" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
