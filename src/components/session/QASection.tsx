import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QASectionProps {
  sessionId: string;
}

export const QASection = ({ sessionId }: QASectionProps) => {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmitting(true);
    
    // TODO: Implement question submission to database
    setTimeout(() => {
      toast({
        title: "Question Submitted",
        description: "Your question has been sent to the speaker",
      });
      setQuestion("");
      setSubmitting(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Ask a Question
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
