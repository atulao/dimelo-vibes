import { Eye, Brain, Target, FolderKanban } from "lucide-react";
import { Card } from "@/components/ui/card";

export const SolutionSection = () => {
  const features = [
    {
      icon: Eye,
      title: "Observe",
      subtitle: "and hear everything in real time",
      description: "Stays attentive to real-time information"
    },
    {
      icon: Brain,
      title: "Interpret",
      subtitle: "the deeper meaning behind the messages",
      description: "Analyzes and understand the underlying message"
    },
    {
      icon: Target,
      title: "Decide",
      subtitle: "what insights matter most to you in the moment",
      description: "Selects the most relevant insights for your current needs"
    },
    {
      icon: FolderKanban,
      title: "Organize",
      subtitle: "it all into your notes to reinforce your learning",
      description: "Structures your notes for better learning retention"
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-6 text-primary">
            The Solution (OÍDO)
          </h2>
          <p className="text-xl text-muted-foreground">
            We're building the agent that keeps you present at conferences
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <feature.icon className="w-16 h-16 mb-6 text-secondary" />
              <h3 className="text-3xl font-serif font-bold mb-2 text-primary">
                {feature.title}
              </h3>
              <p className="text-lg mb-4 text-foreground">
                {feature.subtitle}
              </p>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-medium text-foreground italic">
            Oído listens so you always stay in the loop
          </p>
        </div>
      </div>
    </section>
  );
};
