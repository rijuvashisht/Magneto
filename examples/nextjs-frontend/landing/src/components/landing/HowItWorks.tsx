"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Terminal, FileText, Cpu, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Terminal,
    title: "magneto init",
    description: "Scaffold your project with .magneto/, roles, security policies, and power packs. One command, zero config.",
    color: "#58a6ff",
    command: "$ magneto init --with typescript nextjs",
  },
  {
    icon: FileText,
    title: "magneto plan",
    description: "Auto-classify tasks, assign agent roles, evaluate security risks, and generate execution plans.",
    color: "#3fb950",
    command: "$ magneto plan tasks/add-auth.md",
  },
  {
    icon: Cpu,
    title: "magneto run",
    description: "Multi-agent execution with streaming output, memory persistence, and interactive approval workflow.",
    color: "#d2a8ff",
    command: "$ magneto run tasks/add-auth.md --interactive",
  },
  {
    icon: CheckCircle,
    title: "Ship It",
    description: "Production-ready code with tests, documentation, and security audit. Merge with confidence.",
    color: "#f0883e",
    command: "$ git push origin main ✓",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-32 px-6" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-[#8b949e] text-lg max-w-xl mx-auto">
            From zero to shipped in four steps. Magneto handles the orchestration.
          </p>
        </motion.div>

        {/* Pipeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#58a6ff]/0 via-[#30363d] to-[#58a6ff]/0 -translate-y-1/2" />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="relative group"
              >
                {/* Step number */}
                <div className="flex items-center justify-center mb-6">
                  <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center border border-[#30363d] bg-[#161b22] group-hover:border-opacity-100 transition-all duration-300"
                    style={{
                      borderColor: step.color + "40",
                      boxShadow: `0 0 20px ${step.color}10`,
                    }}
                  >
                    <step.icon
                      className="w-7 h-7 transition-colors"
                      style={{ color: step.color }}
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-xs font-bold text-[#8b949e]">
                      {i + 1}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#8b949e] leading-relaxed mb-4">
                    {step.description}
                  </p>
                  <code className="text-xs font-mono px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#79c0ff]">
                    {step.command}
                  </code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
