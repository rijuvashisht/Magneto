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
    description: "Decompose tasks into subtasks, spawn specialized agents (backend, tester, requirements), and merge results automatically.",
    color: "#d2a8ff",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    description: "Visualize codebase architecture — files, classes, imports, clusters. Find god nodes, detect cycles, explore dependencies interactively.",
    color: "#58a6ff",
  },
  {
    icon: Shield,
    title: "Security Guardrails",
    description: "Every task is evaluated for risk. Protected paths, blocked actions, and approval gates keep your codebase safe.",
    color: "#f85149",
  },
  {
    icon: Database,
    title: "Memory Persistence",
    description: "Agents retain context across sessions. Decisions, learnings, and architecture insights survive restarts and checkpoints.",
    color: "#3fb950",
  },
  {
    icon: Radio,
    title: "Streaming Output",
    description: "Real-time streaming with progress bars, spinners, and multiple output formats (text, JSON, SSE). Zero lag feedback.",
    color: "#f0883e",
  },
  {
    icon: Puzzle,
    title: "Power Packs & Adapters",
    description: "Plug in TypeScript, Next.js, or custom packs. Adapters for Claude, Graphify, OpenClaw, and more.",
    color: "#79c0ff",
  },
  {
    icon: Eye,
    title: "Telepathy",
    description: "Auto-discover tasks from Jira, GitHub, or your requirements folder. Classify, prioritize, and execute — hands-free.",
    color: "#e3b341",
  },
  {
    icon: MessageSquareMore,
    title: "Interactive Approval",
    description: "Review each AI action before it runs. Approve, reject, or modify with inline diffs. Trust but verify.",
    color: "#bc8cff",
  },
];

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-32 px-6 bg-[#0d1117]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-[#8b949e] text-lg max-w-xl mx-auto">
            A complete AI reasoning framework that lives inside your repo.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 hover:bg-[#161b22] hover:border-[#58a6ff]/30 transition-all duration-300 cursor-default"
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(200px at 50% 0%, ${feature.color}08, transparent)`,
                }}
              />

              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: feature.color + "15" }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#8b949e] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
