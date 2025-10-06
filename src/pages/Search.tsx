import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import {
  Search as SearchIcon,
  Calendar,
  Mic,
  FileText,
  Lightbulb,
  Save,
  Bell,
  BellOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: "conference" | "session" | "transcript" | "insight";
  path: string;
  metadata?: any;
  highlightedText?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: any;
  email_alerts: boolean;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedConference, setSelectedConference] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [conferences, setConferences] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(false);

  useEffect(() => {
    fetchConferences();
    fetchSavedSearches();
    const initialQuery = searchParams.get("q");
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  const fetchConferences = async () => {
    const { data } = await supabase
      .from("conferences")
      .select("id, name")
      .order("name");
    setConferences(data || []);
  };

  const fetchSavedSearches = async () => {
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .order("created_at", { ascending: false });
    setSavedSearches(data || []);
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const tsQuery = searchQuery.trim().split(/\s+/).join(" & ");
      const allResults: SearchResult[] = [];

      // Search conferences
      if (selectedType === "all" || selectedType === "conference") {
        let confQuery = supabase
          .from("conferences")
          .select("id, name, description, location")
          .textSearch("search_vector", tsQuery, {
            type: "websearch",
            config: "english",
          });

        if (selectedConference !== "all") {
          confQuery = confQuery.eq("id", selectedConference);
        }

        const { data: conferences } = await confQuery.limit(20);

        allResults.push(
          ...(conferences || []).map((c) => ({
            id: c.id,
            title: c.name,
            description: c.description,
            type: "conference" as const,
            path: `/conferences/${c.id}`,
            metadata: { location: c.location },
          }))
        );
      }

      // Search sessions
      if (selectedType === "all" || selectedType === "session") {
        let sessQuery = supabase
          .from("sessions")
          .select("id, title, speaker_name, description, track_id")
          .textSearch("search_vector", tsQuery, {
            type: "websearch",
            config: "english",
          });

        const { data: sessions } = await sessQuery.limit(20);

        allResults.push(
          ...(sessions || []).map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            type: "session" as const,
            path: `/session/${s.id}`,
            metadata: { speaker: s.speaker_name },
          }))
        );
      }

      // Search transcripts
      if (selectedType === "all" || selectedType === "transcript") {
        const { data: transcripts } = await supabase
          .from("transcript_segments")
          .select("id, session_id, text, speaker_label, start_time")
          .textSearch("search_vector", tsQuery, {
            type: "websearch",
            config: "english",
          })
          .limit(20);

        allResults.push(
          ...(transcripts || []).map((t) => ({
            id: t.id,
            title: `Transcript: ${t.text.substring(0, 100)}...`,
            description: t.text,
            type: "transcript" as const,
            path: `/session/${t.session_id}/replay`,
            metadata: { speaker: t.speaker_label, time: t.start_time },
            highlightedText: highlightMatches(t.text, searchQuery),
          }))
        );
      }

      // Search AI insights
      if (selectedType === "all" || selectedType === "insight") {
        const { data: insights } = await supabase
          .from("ai_insights")
          .select("id, session_id, content, insight_type")
          .textSearch("search_vector", tsQuery, {
            type: "websearch",
            config: "english",
          })
          .limit(20);

        allResults.push(
          ...(insights || []).map((i) => ({
            id: i.id,
            title: `AI Insight: ${i.content.substring(0, 100)}...`,
            description: i.content,
            type: "insight" as const,
            path: `/session/${i.session_id}/live`,
            metadata: { type: i.insight_type },
            highlightedText: highlightMatches(i.content, searchQuery),
          }))
        );
      }

      setResults(allResults);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "An error occurred while searching.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const highlightMatches = (text: string, query: string) => {
    const terms = query.toLowerCase().split(/\s+/);
    let highlighted = text;
    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlighted = highlighted.replace(regex, "<mark>$1</mark>");
    });
    return highlighted;
  };

  const handleSearch = () => {
    performSearch(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const saveSearch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        name: searchName,
        query: query,
        filters: { type: selectedType, conference: selectedConference, dateRange },
        email_alerts: emailAlerts,
      });

      if (error) throw error;

      toast({
        title: "Search Saved",
        description: "Your search has been saved successfully.",
      });

      setSaveDialogOpen(false);
      setSearchName("");
      setEmailAlerts(false);
      fetchSavedSearches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadSavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query);
    setSelectedType(saved.filters?.type || "all");
    setSelectedConference(saved.filters?.conference || "all");
    setDateRange(saved.filters?.dateRange || "all");
    performSearch(saved.query);
  };

  const toggleEmailAlerts = async (searchId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("saved_searches")
      .update({ email_alerts: !currentValue })
      .eq("id", searchId);

    if (!error) {
      fetchSavedSearches();
      toast({
        title: "Updated",
        description: `Email alerts ${!currentValue ? "enabled" : "disabled"}.`,
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "conference":
        return <Calendar className="h-4 w-4" />;
      case "session":
        return <Mic className="h-4 w-4" />;
      case "transcript":
        return <FileText className="h-4 w-4" />;
      case "insight":
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <SearchIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Advanced Search</h1>
          <p className="text-muted-foreground">
            Search across conferences, sessions, transcripts, and AI insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Filters</h3>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="conference">Conferences</SelectItem>
                      <SelectItem value="session">Sessions</SelectItem>
                      <SelectItem value="transcript">Transcripts</SelectItem>
                      <SelectItem value="insight">AI Insights</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Conference</Label>
                  <Select
                    value={selectedConference}
                    onValueChange={setSelectedConference}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conferences</SelectItem>
                      {conferences.map((conf) => (
                        <SelectItem key={conf.id} value={conf.id}>
                          {conf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSearch}
                  className="w-full"
                  disabled={!query.trim()}
                >
                  Apply Filters
                </Button>
              </div>
            </Card>

            {savedSearches.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Saved Searches</h3>
                <div className="space-y-2">
                  {savedSearches.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md"
                    >
                      <button
                        onClick={() => loadSavedSearch(saved)}
                        className="flex-1 text-left text-sm"
                      >
                        {saved.name}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleEmailAlerts(saved.id, saved.email_alerts)
                        }
                      >
                        {saved.email_alerts ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card className="p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!query.trim()}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search
                </Button>
                {query && (
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Save className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Search</DialogTitle>
                        <DialogDescription>
                          Save this search to access it later
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Search Name</Label>
                          <Input
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="My search..."
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-alerts">Email Alerts</Label>
                          <Switch
                            id="email-alerts"
                            checked={emailAlerts}
                            onCheckedChange={setEmailAlerts}
                          />
                        </div>
                        <Button
                          onClick={saveSearch}
                          disabled={!searchName.trim()}
                          className="w-full"
                        >
                          Save Search
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : results.length === 0 && query ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  No results found for "{query}"
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-4 hover:shadow-md transition-shadow">
                    <Link to={result.path}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getTypeIcon(result.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{result.title}</h3>
                            <Badge variant="outline">
                              {result.type}
                            </Badge>
                          </div>
                          {result.highlightedText ? (
                            <p
                              className="text-sm text-muted-foreground"
                              dangerouslySetInnerHTML={{
                                __html: String(result.highlightedText).substring(0, 200) + "...",
                              }}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {result.description?.substring(0, 200)}...
                            </p>
                          )}
                          {result.metadata && (
                            <div className="flex gap-2 mt-2">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                value && (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {String(value)}
                                  </Badge>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
