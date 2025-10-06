import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, ThumbsUp, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Question {
  id: string;
  question: string;
  upvotes: number;
  is_answered: boolean;
  created_at: string;
  user_id: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface QASectionProps {
  sessionId: string;
}

export const QASection = ({ sessionId }: QASectionProps) => {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkOrganizerStatus();
    fetchQuestions();
    
    const interval = setInterval(fetchQuestions, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const checkOrganizerStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data: session } = await supabase
        .from("sessions")
        .select(`
          tracks (
            conferences (
              organization_id
            )
          )
        `)
        .eq("id", sessionId)
        .single();

      if (session?.tracks?.conferences?.organization_id) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .or(`organization_id.eq.${session.tracks.conferences.organization_id},role.eq.admin`);

        setIsOrganizer(!!roles && roles.length > 0);
      }
    } catch (error) {
      console.error("Error checking organizer status:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq("session_id", sessionId)
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error("Error fetching questions:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to ask a question",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("questions")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          question: question.trim(),
        });

      if (error) throw error;

      toast({
        title: "Question Submitted",
        description: "Your question has been sent to the speaker",
      });
      
      setQuestion("");
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId: string, currentUpvotes: number) => {
    try {
      // Optimistic update
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, upvotes: currentUpvotes + 1 } : q
        )
      );

      const { error } = await supabase
        .from("questions")
        .update({ upvotes: currentUpvotes + 1 })
        .eq("id", questionId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      fetchQuestions();
    }
  };

  const handleMarkAnswered = async (questionId: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, is_answered: !currentStatus } : q
        )
      );

      const { error } = await supabase
        .from("questions")
        .update({ 
          is_answered: !currentStatus,
          answered_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq("id", questionId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Marked as Unanswered" : "Marked as Answered",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      fetchQuestions();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Q&A
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px]"
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !question.trim()} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Sending..." : "Submit Question"}
          </Button>
        </form>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Questions ({questions.length})
          </h3>
          
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No questions yet. Be the first to ask!
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {questions.map((q) => (
                <Card 
                  key={q.id} 
                  className={!q.is_answered && isOrganizer ? "border-primary/50" : ""}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm flex-1">{q.question}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpvote(q.id, q.upvotes)}
                          className="flex items-center gap-1"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-xs">{q.upvotes}</span>
                        </Button>
                        {q.is_answered && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                            <Check className="h-3 w-3 mr-1" />
                            Answered
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {isOrganizer && q.profiles && (
                          <span className="font-medium">
                            {q.profiles.full_name || q.profiles.email}
                          </span>
                        )}
                        <span>
                          {new Date(q.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      {isOrganizer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAnswered(q.id, q.is_answered)}
                          className="h-auto py-1 px-2"
                        >
                          {q.is_answered ? "Mark Unanswered" : "Mark Answered"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
