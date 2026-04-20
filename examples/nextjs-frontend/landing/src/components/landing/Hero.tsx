"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, GitFork, BookOpen } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] animate-gradient" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#58a6ff]/5 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#1f6feb]/8 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-[#30363d] bg-[#161b22]/80 backdrop-blur-sm text-sm text-[#8b949e]"
        >
          <Zap className="w-4 h-4 text-[#58a6ff]" />
          <span>v0.8 — Knowledge Graph, Memory, Sub-Agents</span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6"
        >
          <span className="text-white">AI Reasoning &</span>
          <br />
          <span className="bg-gradient-to-r from-[#58a6ff] to-[#bc8cff] bg-clip-text text-transparent">
            Agent Control Plane
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg md:text-xl text-[#8b949e] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Orchestrate multi-agent AI tasks with security guardrails,
          knowledge graphs, and memory persistence.
          Ship features <span className="text-white font-semibold">3–5× faster</span>.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#getting-started"
            className="group flex items-center gap-2 px-8 py-3.5 bg-[#58a6ff] hover:bg-[#79b8ff] text-[#0d1117] font-semibold rounded-lg transition-all duration-200 animate-glow"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="/docs"
            className="flex items-center gap-2 px-8 py-3.5 border border-[#30363d] hover:border-[#58a6ff] text-[#c9d1d9] rounded-lg transition-all duration-200"
          >
            <BookOpen className="w-5 h-5" />
            Documentation
          </a>
          <a
            href="https://github.com/rijuvashisht/Magneto"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-3.5 border border-[#30363d] hover:border-[#58a6ff] text-[#c9d1d9] rounded-lg transition-all duration-200"
          >
            <GitFork className="w-5 h-5" />
            GitHub
          </a>
        </motion.div>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 inline-flex items-center gap-3 px-5 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] font-mono text-sm"
        >
          <span className="text-[#8b949e]">$</span>
          <span className="text-[#79c0ff]">npm install -g magneto-ai</span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-[#30363d] flex items-start justify-center p-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
