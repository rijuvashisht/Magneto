"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

const layers = [
  {
    name: "CLI",
    icon: ">_",
    description: "Every developer workflow in one binary. Auto-detects your stack on first run.",
    items: [
      { label: "magneto init", note: "scaffold + auto-detect packs" },
      { label: "magneto detect", note: "stack confidence scores" },
      { label: "magneto plan", note: "classify → decompose → secure" },
      { label: "magneto run", note: "--stream · --approve-each · --mode" },
      { label: "magneto merge", note: "deduplicate agent outputs" },
      { label: "magneto doctor", note: "validate full setup" },
    ],
    color: "#58a6ff",
  },
  {
    name: "Security Engine",
    icon: "🛡",
    description: "Every task passes through the security engine before a single file is touched.",
    items: [
      { label: "Task Classifier", note: "low / medium / high risk" },
      { label: "Protected Paths", note: ".env · .pem · secrets/**" },
      { label: "Blocked Actions", note: "DROP · rm -rf · destructive ops" },
      { label: "Approval Workflow", note: "--approve-each · audit log" },
      { label: "Execution Modes", note: "observe · assist · execute · restricted" },
      { label: "Guardrail Engine", note: "pre/post execution checks" },
    ],
    color: "#f85149",
  },
  {
    name: "Orchestration",
    icon: "⚙",
    description: "Decomposes tasks, spawns agents in parallel, merges results with confidence weighting.",
    items: [
      { label: "Task Decomposer", note: "splits into parallel subtasks" },
      { label: "Agent Spawner", note: "role-based delegation" },
      { label: "Result Merger", note: "confidence-weighted dedup" },
      { label: "Telepathy Pipeline", note: "auto-handoff between agents" },
      { label: "Token Tracker", note: "per-task cost accounting" },
      { label: "Session Manager", note: "auto-pruned audit sessions" },
    ],
    color: "#d2a8ff",
  },
  {
    name: "Agent Layer",
    icon: "🤖",
    description: "Specialised roles run in parallel — each agent sees only the context it needs.",
    items: [
      { label: "Orchestrator", note: "coordinates all agents" },
      { label: "Backend Agent", note: "API · DB · services" },
      { label: "Frontend Agent", note: "UI · hydration · routing" },
      { label: "Tester Agent", note: "unit · integration · e2e" },
      { label: "Requirements Agent", note: "spec tracing · coverage" },
      { label: "Security Agent", note: "audit · vulnerability scan" },
    ],
    color: "#3fb950",
  },
  {
    name: "Power Packs",
    icon: "🧩",
    description: "Domain intelligence dropped in per language, framework, or cloud. 67 checks active across a full stack.",
    items: [
      { label: "TypeScript", note: "import graph · any detection" },
      { label: "Python", note: "14 checks · Django/FastAPI/Flask" },
      { label: "Java", note: "14 checks · modern Java 17/21" },
      { label: "Next.js", note: "server/client · hydration" },
      { label: "FastAPI", note: "10 checks · CORS · async" },
      { label: "Spring Boot", note: "12 checks · JPA · actuator" },
      { label: "AWS", note: "16 checks · IAM · S3 · Terraform" },
      { label: "Azure", note: "RBAC · networking · infra" },
    ],
    color: "#f0883e",
  },
  {
    name: "Runners",
    icon: "⚡",
    description: "Six execution backends. Auto-selected by environment. Switch with --runner.",
    items: [
      { label: "OpenAI", note: "OPENAI_API_KEY · streaming" },
      { label: "Copilot Local", note: "local agent via MCP tools" },
      { label: "Copilot Cloud", note: "bearer token endpoint" },
      { label: "Cascade / Windsurf", note: "local process · no egress" },
      { label: "Gemini", note: "GEMINI_API_KEY · Google AI" },
      { label: "Ollama", note: "zero egress · no API key" },
    ],
    color: "#e3b341",
  },
];

export default function Architecture() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 md:px-6 bg-transparent" ref={ref}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Architecture
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Six layers, one command. Click any layer to see what&apos;s inside.
          </p>
        </motion.div>

        <div className="space-y-3">
          {layers.map((layer, idx) => {
            const isOpen = activeIdx === idx;
            return (
              <motion.div
                key={layer.name}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
              >
                {/* Layer row — clickable */}
                <button
                  onClick={() => setActiveIdx(isOpen ? null : idx)}
                  className="w-full text-left"
                >
                  <div
                    className="rounded-xl border px-5 py-4 transition-all duration-200 cursor-pointer"
                    style={{
                      borderColor: isOpen ? layer.color : layer.color + "40",
                      background: isOpen ? layer.color + "12" : "rgba(13,17,23,0.6)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon + name badge */}
                      <div
                        className="shrink-0 flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg min-w-[140px]"
                        style={{ color: layer.color, background: layer.color + "18" }}
                      >
                        <span className="text-base">{layer.icon}</span>
                        <span>{layer.name}</span>
                      </div>

                      {/* Pill preview */}
                      <div className="hidden md:flex flex-wrap gap-1.5 flex-1">
                        {layer.items.slice(0, 4).map((item) => (
                          <span
                            key={item.label}
                            className="px-2.5 py-1 rounded-md text-xs border border-gray-700/60 text-gray-400 bg-black/30"
                          >
                            {item.label}
                          </span>
                        ))}
                        {layer.items.length > 4 && (
                          <span className="px-2.5 py-1 rounded-md text-xs text-gray-600">
                            +{layer.items.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-auto shrink-0 text-gray-600"
                        style={{ color: isOpen ? layer.color : undefined }}
                      >
                        ▾
                      </motion.span>
                    </div>
                  </div>
                </button>

                {/* Expanded detail panel */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div
                        className="mx-1 rounded-b-xl border-x border-b px-5 py-5"
                        style={{ borderColor: layer.color + "40", background: layer.color + "08" }}
                      >
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
                          {layer.description}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {layer.items.map((item, i) => (
                            <motion.div
                              key={item.label}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.2 }}
                              className="flex flex-col px-3 py-2.5 rounded-lg border border-gray-700/40 bg-black/30"
                            >
                              <span
                                className="text-sm font-medium"
                                style={{ color: layer.color }}
                              >
                                {item.label}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5">{item.note}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Connector line */}
                {idx < layers.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <div
                      className="w-px h-3 transition-colors duration-300"
                      style={{ background: isOpen ? layer.color + "80" : "#30363d" }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-[#484f58] mt-6 font-mono">
          click any layer to expand · click again to collapse
        </p>
      </div>
    </section>
  );
}
