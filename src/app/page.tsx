import { HeaderNav } from "@/components/lp/HeaderNav";
import { HeroSection } from "@/components/lp/HeroSection";
import { PainSection } from "@/components/lp/PainSection";
import { WhySection } from "@/components/lp/WhySection";
import { SolutionSection } from "@/components/lp/SolutionSection";
import { FeaturesSection } from "@/components/lp/FeaturesSection";
import { ComparisonSection } from "@/components/lp/ComparisonSection";
import { PricingSection } from "@/components/lp/PricingSection";
import { FAQSection } from "@/components/lp/FAQSection";
import { CTASection } from "@/components/lp/CTASection";
import { FooterSection } from "@/components/lp/FooterSection";
import { FadeIn } from "@/components/lp/FadeIn";
import { StickyMobileCTA } from "@/components/lp/StickyMobileCTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderNav />
      <StickyMobileCTA />
      <main className="flex-1">
        <HeroSection />
        <FadeIn><PainSection /></FadeIn>
        <FadeIn><WhySection /></FadeIn>
        <FadeIn><SolutionSection /></FadeIn>
        <FadeIn><FeaturesSection /></FadeIn>
        <FadeIn><ComparisonSection /></FadeIn>
        <FadeIn><PricingSection /></FadeIn>
        <FadeIn><FAQSection /></FadeIn>
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
