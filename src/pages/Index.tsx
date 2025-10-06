import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Hero } from "@/components/Hero";
import { MomentSection } from "@/components/MomentSection";
import { ProblemSection } from "@/components/ProblemSection";
import { SolutionSection } from "@/components/SolutionSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { BenefitsSection } from "@/components/BenefitsSection";
import { OpportunitySection } from "@/components/OpportunitySection";
import { CTASection } from "@/components/CTASection";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { loading } = useAuth();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Show landing page to non-authenticated users
      }
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <MomentSection />
      <ProblemSection />
      <SolutionSection />
      <ComparisonSection />
      <BenefitsSection />
      <OpportunitySection />
      <CTASection />
    </div>
  );
};

export default Index;
