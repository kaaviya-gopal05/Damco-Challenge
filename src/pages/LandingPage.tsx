import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { Hero } from '@/components/landing/Hero';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { FinalCta } from '@/components/landing/FinalCta';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <Hero />
      <FeatureGrid />
      <ProductPreview />
      <FinalCta />
      <Footer />
    </div>
  );
}
