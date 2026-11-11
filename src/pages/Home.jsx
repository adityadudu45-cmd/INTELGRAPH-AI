import PublicNav from '@/components/home/PublicNav';
import Hero from '@/components/home/Hero';
import Ticker from '@/components/home/Ticker';
import PlatformIntro from '@/components/home/PlatformIntro';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import HowItWorks from '@/components/home/HowItWorks';
import NetworkDemo from '@/components/home/NetworkDemo';
import Showcase from '@/components/home/Showcase';
import SecuritySection from '@/components/home/SecuritySection';
import SiteFooter from '@/components/home/SiteFooter';
import CursorGlow from '@/components/home/CursorGlow';
import NexusChat from '@/components/nexus/NexusChat';

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <CursorGlow />
      <PublicNav />
      <main>
        <Hero />
        <Ticker />
        <PlatformIntro />
        <FeatureShowcase />
        <HowItWorks />
        <NetworkDemo />
        <Showcase />
        <SecuritySection />
      </main>
      <SiteFooter />
      <NexusChat />
    </div>
  );
}