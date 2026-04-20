"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  Network,
  Shield,
  Database,
  Radio,
  Puzzle,
  Eye,
  MessageSquareMore,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Multi-Agent Orchestration",
    description: "Decompose tasks into subtasks, spawn specialized agents, and merge results automatically.",
    color: "#a855f7",
    lightColor: "#9333ea",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    description: "Visualize codebase architecture — files, classes, imports. Find god nodes and detect cycles.",
    color: "#3b82f6",
    lightColor: "#2563eb",
  },
  {
    icon: Shield,
    title: "Security Guardrails",
    description: "Every task is evaluated for risk. Protected paths and approval gates keep your codebase safe.",
    color: "#ef4444",
    lightColor: "#dc2626",
  },
  {
    icon: Database,
    title: "Memory Persistence",
    description: "Agents retain context across sessions. Decisions and insights survive restarts.",
    color: "#22c55e",
    lightColor: "#16a34a",
  },
  {
    icon: Radio,
    title: "Streaming Output",
    description: "Real-time streaming with progress bars and multiple output formats. Zero lag feedback.",
    color: "#f97316",
    lightColor: "#ea580c",
  },
  {
    icon: Puzzle,
    title: "Power Packs & Adapters",
    description: "Plug in TypeScript, Next.js, or custom packs. Adapters for Claude, Gemini, and more.",
    color: "#06b6d4",
    lightColor: "#0891b2",
  },
  {
    icon: Eye,
    title: "Telepathy",
    description: "Auto-discover tasks from Jira, GitHub, or requirements. Classify and execute hands-free.",
    color: "#eab308",
    lightColor: "#ca8a04",
  },
  {
    icon: MessageSquareMore,
    title: "Interactive Approval",
    description: "Review each AI action before it runs. Approve, reject, or modify with inline diffs.",
    color: "#ec4899",
    lightColor: "#db2777",
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section 
      id="features" 
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
            Everything You Need
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            A complete AI reasoning framework that lives inside your repo.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative p-6 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 bg-white/40 dark:bg-black/30 backdrop-blur-md hover:border-gray-400 dark:hover:border-gray-500 hover:bg-white/60 dark:hover:bg-black/40 transition-all duration-300"
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shadow-sm"
                style={{ 
                  backgroundColor: `${feature.color}15`,
                }}
              >
                <feature.icon 
                  className="w-6 h-6" 
                  style={{ color: feature.color }} 
                />
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                {feature.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
