import heroImage from "@/assets/hero-conference.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroImage})`,
          filter: 'brightness(0.3)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      
      <div className="container relative z-10 mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-secondary/90 backdrop-blur-sm rounded-full">
            <span className="text-2xl font-bold text-secondary-foreground font-serif">Atula'o</span>
          </div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-serif font-bold mb-6 text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Introducing Dímelo
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          The agent that keeps you present at conferences while capturing every insight
        </p>
      </div>
    </section>
  );
};
