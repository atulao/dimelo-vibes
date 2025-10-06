import { Mic, Calendar, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";

export const BenefitsSection = () => {
  const benefits = [
    {
      icon: Mic,
      emoji: "🎤",
      title: "Speakers",
      items: [
        "See live engagement signals during their session",
        "Review unanswered questions afterward & respond post-event",
        "Receive an instant summary & audience feedback to improve future talks"
      ]
    },
    {
      icon: Calendar,
      emoji: "🗂️",
      title: "Organizers",
      items: [
        "Gain real-time visibility into which sessions resonate most",
        "Access complete engagement metrics, transcripts, and Q&A logs",
        "Deliver more value to attendees & sponsors with post-event insights"
      ]
    },
    {
      icon: Briefcase,
      emoji: "💼",
      title: "Sponsors",
      items: [
        "Embed branding into recaps & live summaries for visibility",
        "Receive engagement heatmaps showing their impact",
        "Demonstrate measurable ROI with detailed post-event reports"
      ]
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl md:text-6xl font-serif font-bold mb-16 text-center text-primary">
          Who Else Benefits?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-5xl mb-4">{benefit.emoji}</div>
              <h3 className="text-2xl font-serif font-bold mb-6 text-primary">
                {benefit.title}
              </h3>
              <ul className="space-y-3">
                {benefit.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-muted-foreground leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
