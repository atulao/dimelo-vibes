import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar, MapPin, Building2, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Browse = () => {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      let query = supabase
        .from("conferences")
        .select(`
          *,
          organizations (
            name,
            logo_url
          ),
          tracks (
            id,
            sessions (id)
          )
        `)
        .eq("is_active", true)
        .order("start_date", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setConferences(data || []);
    } catch (error) {
      console.error("Error fetching conferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConferences = conferences.filter((conf) => {
    const matchesSearch = 
      conf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conf.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conf.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = 
      locationFilter === "all" || 
      conf.location?.toLowerCase().includes(locationFilter.toLowerCase());

    const now = new Date();
    const startDate = new Date(conf.start_date);
    const matchesDate = 
      dateFilter === "all" ||
      (dateFilter === "upcoming" && startDate > now) ||
      (dateFilter === "this-month" && startDate.getMonth() === now.getMonth() && startDate.getFullYear() === now.getFullYear());

    return matchesSearch && matchesLocation && matchesDate;
  });

  const locations = Array.from(new Set(conferences.map(c => c.location).filter(Boolean)));

  const getSessionCount = (conf: any) => {
    return conf.tracks?.reduce((acc: number, t: any) => acc + (t.sessions?.length || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Conferences</h1>
          <p className="text-muted-foreground">
            Discover upcoming conferences and register for sessions
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conferences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredConferences.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No conferences found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredConferences.map((conf) => (
              <Card key={conf.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="line-clamp-2 flex-1">{conf.name}</CardTitle>
                    {conf.start_date && new Date(conf.start_date) > new Date() && (
                      <Badge variant="secondary">Upcoming</Badge>
                    )}
                  </div>
                  {conf.organizations && (
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {conf.organizations.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
                    {conf.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conf.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {conf.start_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(conf.start_date).toLocaleDateString()} - {new Date(conf.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {conf.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{conf.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <span className="text-sm font-medium">
                        {getSessionCount(conf)} sessions available
                      </span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/conferences/${conf.id}`)}
                  >
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
