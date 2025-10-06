import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Mic, Lightbulb, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "conference" | "session" | "transcript" | "insight";
  path: string;
  rank: number;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const tsQuery = searchQuery.trim().split(/\s+/).join(" & ");

      // Search conferences
      const { data: conferences } = await supabase
        .from("conferences")
        .select("id, name, description, location")
        .textSearch("search_vector", tsQuery, {
          type: "websearch",
          config: "english",
        })
        .limit(5);

      // Search sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, title, speaker_name, description")
        .textSearch("search_vector", tsQuery, {
          type: "websearch",
          config: "english",
        })
        .limit(5);

      // Search transcript segments
      const { data: transcripts } = await supabase
        .from("transcript_segments")
        .select("id, session_id, text, speaker_label")
        .textSearch("search_vector", tsQuery, {
          type: "websearch",
          config: "english",
        })
        .limit(5);

      // Search AI insights
      const { data: insights } = await supabase
        .from("ai_insights")
        .select("id, session_id, content, insight_type")
        .textSearch("search_vector", tsQuery, {
          type: "websearch",
          config: "english",
        })
        .limit(5);

      const allResults: SearchResult[] = [
        ...(conferences || []).map((c, idx) => ({
          id: c.id,
          title: c.name,
          subtitle: c.location || c.description?.substring(0, 60),
          type: "conference" as const,
          path: `/conferences/${c.id}`,
          rank: idx,
        })),
        ...(sessions || []).map((s, idx) => ({
          id: s.id,
          title: s.title,
          subtitle: s.speaker_name || s.description?.substring(0, 60),
          type: "session" as const,
          path: `/session/${s.id}`,
          rank: idx,
        })),
        ...(transcripts || []).map((t, idx) => ({
          id: t.id,
          title: t.text.substring(0, 80) + "...",
          subtitle: t.speaker_label || "Transcript segment",
          type: "transcript" as const,
          path: `/session/${t.session_id}/replay`,
          rank: idx,
        })),
        ...(insights || []).map((i, idx) => ({
          id: i.id,
          title: i.content.substring(0, 80) + "...",
          subtitle: i.insight_type,
          type: "insight" as const,
          path: `/session/${i.session_id}/live`,
          rank: idx,
        })),
      ];

      setResults(allResults.sort((a, b) => a.rank - b.rank));
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
  }, [toast]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "conference":
        return <Calendar className="h-4 w-4" />;
      case "session":
        return <Mic className="h-4 w-4" />;
      case "transcript":
        return <FileText className="h-4 w-4" />;
      case "insight":
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: SearchResult["type"]) => {
    const variants: Record<string, any> = {
      conference: "default",
      session: "secondary",
      transcript: "outline",
      insight: "destructive",
    };
    return (
      <Badge variant={variants[type]} className="text-xs">
        {type}
      </Badge>
    );
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border rounded-md hover:bg-muted/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search conferences, sessions, transcripts..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : (
            <>
              <CommandEmpty>
                {query ? "No results found." : "Type to search..."}
              </CommandEmpty>

              {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup
                  key={type}
                  heading={type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                >
                  {items.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result.path)}
                      className="flex items-start gap-3 py-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {result.title}
                          </span>
                          {getTypeBadge(result.type)}
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {results.length > 0 && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      navigate(`/search?q=${encodeURIComponent(query)}`);
                    }}
                    className="justify-center text-primary"
                  >
                    View all results in advanced search →
                  </CommandItem>
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
