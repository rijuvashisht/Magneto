import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import CliDemo from "@/components/landing/CliDemo";
import Architecture from "@/components/landing/Architecture";
import GetStarted from "@/components/landing/GetStarted";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Features />
      <CliDemo />
      <Architecture />
      <GetStarted />
      <Footer />
    </main>
  );
}
