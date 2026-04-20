"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Terminal, FileText, Cpu, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Terminal,
    title: "magneto init",
    description: "Scaffold your project with roles, security policies, and power packs. One command, zero config.",
    color: "#3b82f6",
    command: "magneto init --with typescript nextjs",
  },
  {
    icon: FileText,
    title: "magneto plan",
    description: "Auto-classify tasks, assign agent roles, evaluate risks, and generate execution plans.",
    color: "#22c55e",
    command: "magneto plan tasks/add-auth.md",
  },
  {
    icon: Cpu,
    title: "magneto run",
    description: "Multi-agent execution with streaming output, memory persistence, and interactive approval.",
    color: "#a855f7",
    command: "magneto run tasks/add-auth.md --interactive",
  },
  {
    icon: CheckCircle,
    title: "Ship It",
    description: "Production-ready code with tests, documentation, and security audit. Merge with confidence.",
    color: "#f97316",
    command: "git push origin main ✓",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section 
      id="how-it-works" 
      className="py-24 md:py-32 px-6 bg-transparent" 
      ref={ref}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 px-6 py-10 mb-16 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            From zero to shipped in four steps. Magneto handles the orchestration.
          </p>
        </motion.div>

        {/* Pipeline */}
        <div className="relative">
          {/* Connecting line - desktop */}
          <div className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-30" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative"
              >
                {/* Card */}
                <div className="bg-white/40 dark:bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-white/60 dark:hover:bg-black/40 transition-all duration-300 h-full">
                  {/* Icon with step number */}
                  <div className="flex items-center justify-center mb-6">
                    <div
                      className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{
                        backgroundColor: `${step.color}15`,
                      }}
                    >
                      <step.icon
                        className="w-8 h-8"
                        style={{ color: step.color }}
                      />
                      <div 
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                        style={{ backgroundColor: step.color }}
                      >
                        {i + 1}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
                      {step.description}
                    </p>
                    
                    {/* Command */}
                    <div className="bg-white/50 dark:bg-black/30 rounded-lg px-4 py-2.5 border border-gray-300/50 dark:border-gray-700/50">
                      <code className="text-xs font-mono text-gray-700 dark:text-purple-400 font-medium">
                        <span className="text-gray-400 dark:text-gray-500">$ </span>
                        {step.command}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Arrow connector - desktop only */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-24 z-10">
                    <ArrowRight className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
