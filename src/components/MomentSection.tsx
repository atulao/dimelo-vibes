import missedMoment from "@/assets/missed-moment.jpg";

export const MomentSection = () => {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-5xl md:text-6xl font-serif font-bold mb-16 text-center text-primary">
          The Moment
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-primary mb-6">Picture this:</h3>
            
            <p className="text-lg text-foreground leading-relaxed">
              You're at a conference. The speaker is dropping wisdom about something you're deeply passionate about.
            </p>
            
            <p className="text-lg text-foreground leading-relaxed">
              Your phone buzzes, and it's an urgent message needing your attention.
            </p>
            
            <p className="text-lg text-foreground leading-relaxed">
              You step out for 3 minutes.
            </p>
            
            <p className="text-lg text-foreground leading-relaxed">
              When you return, the audience is on fire. Everyone's either taking notes or clapping with excitement.
            </p>
            
            <p className="text-lg font-semibold text-foreground leading-relaxed">
              Something big just happened.
            </p>
            
            <p className="text-3xl font-serif font-bold text-primary mt-8">
              . . . And you missed it.
            </p>
            
            <p className="text-xl text-muted-foreground italic mt-8">
              If only you could ask someone . . .
            </p>
            
            <p className="text-2xl font-medium text-secondary mt-4">
              " Tell me what I missed "
            </p>
          </div>
          
          <div className="relative">
            <img 
              src={missedMoment} 
              alt="Conference moment" 
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
