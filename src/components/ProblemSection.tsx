import { AlertCircle, Clock, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";

export const ProblemSection = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 text-primary">
            The Cost of Distraction
          </h2>
          
          <div className="bg-card border-l-4 border-secondary p-8 rounded-lg shadow-lg">
            <p className="text-2xl md:text-3xl font-medium text-foreground">
              We forget up to 90% of what we learn within a week
            </p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 text-center hover:shadow-xl transition-shadow duration-300">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <h3 className="text-xl font-semibold mb-3 text-primary">Struggling</h3>
            <p className="text-muted-foreground">
              To capture all the insights while trying to network and engage
            </p>
          </Card>
          
          <Card className="p-8 text-center hover:shadow-xl transition-shadow duration-300">
            <Clock className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <h3 className="text-xl font-semibold mb-3 text-primary">Losing</h3>
            <p className="text-muted-foreground">
              50% of information within the first hour after learning
            </p>
          </Card>
          
          <Card className="p-8 text-center hover:shadow-xl transition-shadow duration-300">
            <TrendingDown className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <h3 className="text-xl font-semibold mb-3 text-primary">Forgetting</h3>
            <p className="text-muted-foreground">
              70% by 24 hours and 90% within a week without reinforcement
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
