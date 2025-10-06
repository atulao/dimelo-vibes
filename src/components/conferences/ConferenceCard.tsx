import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { format, isBefore, isAfter } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Conference {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  created_at: string;
}

interface ConferenceCardProps {
  conference: Conference;
}

export const ConferenceCard = ({ conference }: ConferenceCardProps) => {
  const navigate = useNavigate();

  const getStatus = () => {
    if (!conference.start_date || !conference.end_date) return "upcoming";

    const now = new Date();
    const start = new Date(conference.start_date);
    const end = new Date(conference.end_date);

    if (isBefore(now, start)) return "upcoming";
    if (isAfter(now, end)) return "past";
    return "active";
  };

  const status = getStatus();

  const statusColors = {
    upcoming: "bg-blue-500",
    active: "bg-green-500",
    past: "bg-gray-500",
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/conferences/${conference.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">{conference.name}</CardTitle>
              <Badge className={statusColors[status]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {conference.description && (
              <CardDescription className="line-clamp-2">
                {conference.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {conference.start_date && conference.end_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(conference.start_date), "MMM d, yyyy")} -{" "}
                {format(new Date(conference.end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}
          {conference.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{conference.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
