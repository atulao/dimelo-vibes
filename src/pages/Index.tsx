import { Hero } from "@/components/Hero";
import { MomentSection } from "@/components/MomentSection";
import { ProblemSection } from "@/components/ProblemSection";
import { SolutionSection } from "@/components/SolutionSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { BenefitsSection } from "@/components/BenefitsSection";
import { OpportunitySection } from "@/components/OpportunitySection";
import { CTASection } from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen">
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
