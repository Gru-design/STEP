import { HeaderNav } from "@/components/lp/HeaderNav";
import { HeroSection } from "@/components/lp/HeroSection";
import { PainSection } from "@/components/lp/PainSection";
import { SolutionSection } from "@/components/lp/SolutionSection";
import { FeaturesSection } from "@/components/lp/FeaturesSection";
import { ComparisonSection } from "@/components/lp/ComparisonSection";
import { PricingSection } from "@/components/lp/PricingSection";
import { FAQSection } from "@/components/lp/FAQSection";
import { CTASection } from "@/components/lp/CTASection";
import { FooterSection } from "@/components/lp/FooterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav />
      <main className="flex-1">
        <HeroSection />
        <PainSection />
        <SolutionSection />
        <FeaturesSection />
        <ComparisonSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
