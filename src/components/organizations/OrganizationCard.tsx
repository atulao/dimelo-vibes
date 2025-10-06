import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Building } from "lucide-react";
import { format } from "date-fns";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  owner_id: string;
}

interface OrganizationCardProps {
  organization: Organization;
  currentUserId: string;
  onEdit: (org: Organization) => void;
  onDelete: (id: string) => void;
}

export const OrganizationCard = ({
  organization,
  currentUserId,
  onEdit,
  onDelete,
}: OrganizationCardProps) => {
  const isOwner = organization.owner_id === currentUserId;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">{organization.name}</CardTitle>
              <CardDescription>
                Created {format(new Date(organization.created_at), "MMM d, yyyy")}
              </CardDescription>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(organization)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(organization.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      {organization.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{organization.description}</p>
        </CardContent>
      )}
    </Card>
  );
};
