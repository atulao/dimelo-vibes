import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Organizations = () => {
  useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Organizations</h1>
            <p className="text-muted-foreground">Manage your conference organizations</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Create your first organization to begin</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organizations help you manage conferences, tracks, and sessions all in one place.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Organizations;
