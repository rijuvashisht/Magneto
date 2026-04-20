"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, GitFork, Sparkles, Zap } from "lucide-react";
import { getVersionBadgeText } from "@/lib/version";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent">
      {/* Content - higher z-index than magnetic field */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mx-auto w-fit flex items-center gap-6 px-10 py-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-400/5 border border-purple-500/30 dark:border-purple-400/20 backdrop-blur-sm">
            <Zap 
              className="w-20 h-20 md:w-24 md:h-24 text-purple-600 dark:text-purple-400" 
              strokeWidth={1.5}
            />
            <span className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Magneto
            </span>
          </div>
        </motion.div>

        {/* Version Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-full border border-gray-300/50 dark:border-gray-700/50 bg-white/50 dark:bg-black/30 backdrop-blur-md text-sm"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-gray-600 dark:text-gray-400">{getVersionBadgeText()}</span>
        </motion.div>

        {/* Headline + Subtitle - with subtle backdrop for readability */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative rounded-3xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 px-6 py-10 mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-gray-900 dark:text-white">AI Reasoning &</span>
            <br />
            <span className="text-gray-900 dark:text-white">Agent Control Plane</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Orchestrate multi-agent AI tasks with security guardrails,
            knowledge graphs, and memory persistence.
            Ship features <strong className="text-gray-900 dark:text-white">3–5× faster</strong>.
          </p>
        </motion.div>

        {/* CTA buttons - Clean Angular style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <a
            href="/docs/getting-started"
            className="group flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full transition-all duration-200 shadow-lg"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="/docs"
            className="flex items-center gap-2 px-8 py-3.5 border-2 border-gray-400/50 dark:border-gray-600/50 hover:border-gray-900 dark:hover:border-white bg-white/40 dark:bg-black/30 backdrop-blur-sm text-gray-900 dark:text-white font-medium rounded-full transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            Documentation
          </a>
          <a
            href="https://github.com/rijuvashisht/Magneto"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-3.5 border-2 border-gray-400/50 dark:border-gray-600/50 hover:border-gray-900 dark:hover:border-white bg-white/40 dark:bg-black/30 backdrop-blur-sm text-gray-900 dark:text-white font-medium rounded-full transition-all duration-200"
          >
            <GitFork className="w-4 h-4" />
            GitHub
          </a>
        </motion.div>

        {/* Install command - Clean style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-300/50 dark:border-gray-700/50 font-mono text-sm"
        >
          <span className="text-gray-400">$</span>
          <span className="text-purple-600 dark:text-purple-400 font-medium">npm install -g magneto-ai</span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-gray-700 flex items-start justify-center p-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
