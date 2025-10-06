import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

export const CTASection = () => {
  const steps = [
    "Join sessions instantly via QR code",
    "Real-time summaries keep everyone aligned, even when arriving late or stepping out",
    "Smart question submission eliminates duplicates and optimizes Q&A time",
    "Post-session dashboard provides speakers and organizers with summaries, unanswered questions, and engagement metrics"
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-secondary/10 via-background to-accent/10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-8 text-primary">
            Call to Action
          </h2>
          
          <p className="text-2xl md:text-3xl text-foreground mb-12 font-medium">
            Let's pilot Dímelo at your next summit to prove the impact together.
          </p>
          
          <div className="bg-card p-8 md:p-12 rounded-2xl shadow-2xl mb-12">
            <h3 className="text-2xl font-serif font-bold mb-8 text-primary">
              Live Demo Features
            </h3>
            <ul className="space-y-4 text-left max-w-2xl mx-auto mb-8">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                  <span className="text-lg text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground mb-8">
              Align on which sessions to enable, how many attendees, and what data points matter most to you. 
              We'll handle setup, on-site support, and full post-event deliverables.
            </p>
            
            <Button 
              size="lg" 
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xl px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              Get Started with Dímelo
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
          
          <div className="mt-20 pt-12 border-t border-border">
            <p className="text-xl text-foreground italic mb-4">
              We want to live in a world where conference attendees can leave their event feeling like they've captured everything.
            </p>
            <p className="text-lg text-muted-foreground">
              We appreciate your time and interest in Dímelo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
