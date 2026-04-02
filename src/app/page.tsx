import { HeaderNav } from "@/components/lp/HeaderNav";
import { HeroSection } from "@/components/lp/HeroSection";
import { StatsSection } from "@/components/lp/StatsSection";
import { FeaturesSection } from "@/components/lp/FeaturesSection";
import { SolutionSection } from "@/components/lp/SolutionSection";
import { PlatformSection } from "@/components/lp/PlatformSection";
import { PricingSection } from "@/components/lp/PricingSection";
import { TestimonialsSection } from "@/components/lp/TestimonialsSection";
import { CTASection } from "@/components/lp/CTASection";
import { FooterSection } from "@/components/lp/FooterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <SolutionSection />
        <PlatformSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
