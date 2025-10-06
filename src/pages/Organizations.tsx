import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog";
import { EditOrganizationDialog } from "@/components/organizations/EditOrganizationDialog";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Organizations = () => {
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOrg, setEditOrg] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
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

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });

      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
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
            <h1 className="text-4xl font-bold mb-2">Organizations</h1>
            <p className="text-muted-foreground">Manage your conference organizations</p>
          </div>
          <CreateOrganizationDialog onSuccess={fetchOrganizations} />
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No organizations yet. Create your first organization to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                currentUserId={user?.id || ""}
                onEdit={setEditOrg}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}
      </div>

      <EditOrganizationDialog
        organization={editOrg}
        open={!!editOrg}
        onOpenChange={(open) => !open && setEditOrg(null)}
        onSuccess={fetchOrganizations}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this organization and all associated conferences, tracks, and sessions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Organizations;
