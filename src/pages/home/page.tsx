import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import HeroSection from "@/pages/home/components/HeroSection";
import GuiaCidadaoSection from "@/pages/home/components/GuiaCidadaoSection";
import AboutSection from "@/pages/home/components/AboutSection";
import NewsSection from "@/pages/home/components/NewsSection";
import CitizenCTA from "@/pages/home/components/CitizenCTA";
import TestimonialsSection from "@/pages/home/components/TestimonialsSection";
import RequerimentoSection from "@/pages/home/components/RequerimentoSection";
import OpportunitiesTeaser from "@/pages/home/components/OpportunitiesTeaser";
import InvestimentosSection from "@/pages/home/components/InvestimentosSection";
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <InvestimentosSection />
        <GuiaCidadaoSection />
        <AboutSection />
        <OpportunitiesTeaser />
        <NewsSection />
        <CitizenCTA />
        <RequerimentoSection />
        <TestimonialsSection />
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}