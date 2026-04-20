import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import CliDemo from "@/components/landing/CliDemo";
import Architecture from "@/components/landing/Architecture";
import GetStarted from "@/components/landing/GetStarted";
import Footer from "@/components/landing/Footer";
import MagneticField from "@/components/landing/MagneticField";

export default function Home() {
  return (
    <main className="relative">
      {/* Magnetic field background - covers full page */}
      <MagneticField />
      
      {/* All content sections with higher z-index */}
      <div className="relative z-10">
        <Hero />
        <HowItWorks />
        <Features />
        <CliDemo />
        <Architecture />
        <GetStarted />
        <Footer />
      </div>
    </main>
  );
}
