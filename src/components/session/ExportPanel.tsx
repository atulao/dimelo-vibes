import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Share2, 
  FileText, 
  Copy,
  Globe,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExportPanelProps {
  sessionId: string;
  sessionTitle: string;
  isPublic: boolean;
  onTogglePublic: () => void;
}

export const ExportPanel = ({ 
  sessionId, 
  sessionTitle, 
  isPublic,
  onTogglePublic 
}: ExportPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopySummary = async () => {
    try {
      setLoading(true);
      
      const { data: insights } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("session_id", sessionId)
        .order("transcript_version", { ascending: false })
        .limit(50);

      if (!insights || insights.length === 0) {
        toast({
          title: "No insights available",
          description: "Generate insights first before copying",
          variant: "destructive",
        });
        return;
      }

      const latestVersion = insights[0].transcript_version;
      const latestInsights = insights.filter(i => i.transcript_version === latestVersion);

      const summary = latestInsights.find(i => i.insight_type === "summary")?.content || "";
      const keyPoints = latestInsights.filter(i => i.insight_type === "key_point");
      const actionItems = latestInsights.filter(i => i.insight_type === "action_item");
      const quotes = latestInsights.filter(i => i.insight_type === "quote");

      let markdown = `# ${sessionTitle}\n\n`;
      markdown += `## Summary\n${summary}\n\n`;
      
      if (keyPoints.length > 0) {
        markdown += `## Key Points\n`;
        keyPoints.forEach((point) => {
          markdown += `- ${point.content}\n`;
        });
        markdown += `\n`;
      }

      if (actionItems.length > 0) {
        markdown += `## Action Items\n`;
        actionItems.forEach((item) => {
          markdown += `- ${item.content}\n`;
        });
        markdown += `\n`;
      }

      if (quotes.length > 0) {
        markdown += `## Notable Quotes\n`;
        quotes.forEach((quote) => {
          markdown += `> "${quote.content}"\n\n`;
        });
      }

      await copyToClipboard(markdown, "Summary");
    } catch (error) {
      console.error("Error copying summary:", error);
      toast({
        title: "Error",
        description: "Failed to copy summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTranscript = async () => {
    try {
      setLoading(true);
      
      const { data: segments } = await supabase
        .from("transcript_segments")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (!segments || segments.length === 0) {
        toast({
          title: "No transcript available",
          description: "No transcript segments found for this session",
          variant: "destructive",
        });
        return;
      }

      // Format as Markdown
      let markdown = `# ${sessionTitle}\n## Transcript\n\n`;
      
      let currentSpeaker = "";
      segments.forEach((segment) => {
        const speaker = segment.speaker_name || segment.speaker_label || "Speaker";
        const timestamp = segment.start_time 
          ? `[${Math.floor(segment.start_time / 60)}:${String(Math.floor(segment.start_time % 60)).padStart(2, '0')}]`
          : "";
        
        if (speaker !== currentSpeaker) {
          markdown += `\n**${speaker}** ${timestamp}\n`;
          currentSpeaker = speaker;
        }
        markdown += `${segment.text}\n\n`;
      });

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_transcript.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: "Transcript downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading transcript:", error);
      toast({
        title: "Error",
        description: "Failed to download transcript",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInsights = async () => {
    try {
      setLoading(true);
      
      const { data: insights } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("session_id", sessionId)
        .order("transcript_version", { ascending: false })
        .limit(50);

      if (!insights || insights.length === 0) {
        toast({
          title: "No insights available",
          description: "Generate insights first before downloading",
          variant: "destructive",
        });
        return;
      }

      const latestVersion = insights[0].transcript_version;
      const latestInsights = insights.filter(i => i.transcript_version === latestVersion);

      const summary = latestInsights.find(i => i.insight_type === "summary")?.content || "";
      const keyPoints = latestInsights.filter(i => i.insight_type === "key_point");
      const actionItems = latestInsights.filter(i => i.insight_type === "action_item");
      const quotes = latestInsights.filter(i => i.insight_type === "quote");

      let markdown = `# ${sessionTitle}\n## AI-Generated Insights\n\n`;
      markdown += `### Summary\n${summary}\n\n`;
      
      if (keyPoints.length > 0) {
        markdown += `### Key Points\n`;
        keyPoints.forEach((point) => {
          const confidence = point.confidence_score ? ` *(${point.confidence_score} confidence)*` : '';
          markdown += `- ${point.content}${confidence}\n`;
        });
        markdown += `\n`;
      }

      if (actionItems.length > 0) {
        markdown += `### Action Items\n`;
        actionItems.forEach((item) => {
          const confidence = item.confidence_score ? ` *(${item.confidence_score} confidence)*` : '';
          markdown += `- ${item.content}${confidence}\n`;
        });
        markdown += `\n`;
      }

      if (quotes.length > 0) {
        markdown += `### Notable Quotes\n`;
        quotes.forEach((quote) => {
          markdown += `> "${quote.content}"\n\n`;
        });
      }

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_insights.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: "Insights downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading insights:", error);
      toast({
        title: "Error",
        description: "Failed to download insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = () => {
    setShowShareDialog(true);
  };

  const copyReplayLink = () => {
    const replayUrl = `${window.location.origin}/session/${sessionId}/replay`;
    copyToClipboard(replayUrl, "Replay link");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Export & Share
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                Export Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Download</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleDownloadTranscript}>
                <FileText className="mr-2 h-4 w-4" />
                Download Transcript (MD)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadInsights}>
                <FileText className="mr-2 h-4 w-4" />
                Download Insights (MD)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Copy</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleCopySummary}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Summary to Clipboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleShareLink}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Replay Link
          </Button>

          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {isPublic ? (
                  <>
                    <Globe className="h-4 w-4 text-green-500" />
                    <span>Public Access</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span>Private</span>
                  </>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePublic}
              >
                Toggle
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isPublic 
                ? "Anyone with the link can view this session replay"
                : "Only authorized users can access this session"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Session Replay</DialogTitle>
            <DialogDescription>
              Share this link with others to let them view the session replay
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-mono break-all">
                {`${window.location.origin}/session/${sessionId}/replay`}
              </p>
            </div>
            <Button onClick={copyReplayLink} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
