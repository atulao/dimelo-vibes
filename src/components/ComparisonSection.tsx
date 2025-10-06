import { X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

export const ComparisonSection = () => {
  const before = [
    "Furious note-taking",
    '"What did I miss?"',
    "Forgotten follow-ups",
    "70-90% of content forgotten after a week"
  ];

  const after = [
    "Live Rolling Summary",
    "Instant Catch-up",
    "Personal Takeaways",
    "Memory Reinforcement",
    "Knowledge Retention"
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl md:text-6xl font-serif font-bold mb-16 text-center text-primary">
          The Attendee Experience
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 bg-destructive/5 border-destructive/20">
            <h3 className="text-3xl font-serif font-bold mb-8 text-primary flex items-center gap-3">
              <X className="w-8 h-8 text-destructive" />
              Before Dímelo:
            </h3>
            <ul className="space-y-4">
              {before.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-lg text-foreground">
                  <X className="w-5 h-5 text-destructive mt-1 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          
          <Card className="p-8 bg-secondary/5 border-secondary/20">
            <h3 className="text-3xl font-serif font-bold mb-8 text-primary flex items-center gap-3">
              <Check className="w-8 h-8 text-secondary" />
              With Dímelo:
            </h3>
            <ul className="space-y-4">
              {after.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-lg text-foreground">
                  <Check className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        
        <div className="text-center mt-16 max-w-4xl mx-auto">
          <p className="text-2xl font-medium text-foreground italic">
            Dímelo aims to capture the vanishing value we see at conferences and turn it into lasting knowledge
          </p>
        </div>
      </div>
    </section>
  );
};
