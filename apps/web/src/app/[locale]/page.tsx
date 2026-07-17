import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { WaveDivider } from '@/components/ui/WaveDivider';
import { Hero } from '@/components/landing/Hero';
import { StatsBand } from '@/components/landing/StatsBand';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SurpriseBag } from '@/components/landing/SurpriseBag';
import { MerchantCta } from '@/components/landing/MerchantCta';
import { AppSection } from '@/components/landing/AppSection';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <WaveDivider from="bg-cream" fill="text-pine" />
        <StatsBand />
        <WaveDivider from="bg-pine" fill="text-cream-deep" flip />
        <HowItWorks />
        {/* cream-deep → cream : transition douce, sans vague */}
        <SurpriseBag />
        <WaveDivider from="bg-cream" fill="text-pine" />
        <MerchantCta />
        <WaveDivider from="bg-pine" fill="text-cream-deep" flip />
        <AppSection />
        <WaveDivider from="bg-cream-deep" fill="text-pine" />
      </main>
      <SiteFooter />
    </>
  );
}
