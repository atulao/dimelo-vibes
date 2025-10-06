import speakerSession from "@/assets/speaker-session.jpg";

export const OpportunitySection = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-12 text-center text-primary">
            The Opportunity
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src={speakerSession} 
                alt="Conference opportunity" 
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
            
            <div>
              <p className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">
                $325B
              </p>
              <p className="text-2xl text-foreground mb-8">
                is spent on conferences globally every year
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The global corporate event market continues to grow with rapid technological advances, 
                increased economic investment, and significant strides in sustainability practices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
