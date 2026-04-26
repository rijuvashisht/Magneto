"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

const STACKS = [
  { label: "Next.js", packs: "typescript nextjs" },
  { label: "Python / FastAPI", packs: "python fastapi" },
  { label: "Java / Spring Boot", packs: "java spring-boot" },
  { label: "AWS / Terraform", packs: "aws" },
  { label: "Auto-detect", packs: "" },
];

const STEP_COLORS = ["#58a6ff", "#3fb950", "#d2a8ff", "#e3b341"];

function getSteps(packs: string) {
  const initCmd = packs
    ? `magneto init --with ${packs}`
    : "magneto init --auto-install";
  return [
    {
      label: "Install",
      description: "One global binary. No per-project setup needed.",
      code: "npm install -g magneto-ai",
      output: "added 1 package — magneto-ai@0.28.0",
    },
    {
      label: "Initialize",
      description: packs
        ? `Scaffold .magneto/, agent definitions, MCP config, and load the ${packs} packs.`
        : "Magneto scans your project and installs all detected packs automatically.",
      code: initCmd,
      output: packs
        ? `✓ Power packs loaded  (${packs})\n✓ Magneto AI initialized!`
        : "✓ Detected 5 stacks · installed 5 packs\n✓ Magneto AI initialized!",
    },
    {
      label: "Plan",
      description: "Classify the task, check security risk, decompose into parallel agent subtasks.",
      code: "magneto plan tasks/my-task.md",
      output: "Classification: feature-implementation\nSecurity Risk: low ✓\nAgents: orchestrator, backend, tester\n✓ Plan saved",
    },
    {
      label: "Run",
      description: "Agents execute in parallel with streaming output. Results merged automatically.",
      code: "magneto run tasks/my-task.md --stream",
      output: "[backend]  ████████░░  80%\n[tester]   ██████████ 100%\n✓ Task complete — 12 files · 31 tests",
    },
  ];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2.5 right-2.5 p-1.5 rounded-md hover:bg-white/10 transition-colors text-[#484f58] hover:text-[#8b949e]"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const STATS = [
  { value: "68%", label: "Fewer tokens" },
  { value: "3–5×", label: "Faster delivery" },
  { value: "67", label: "Active checks" },
  { value: "0", label: "Config files" },
];

export default function GetStarted() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [stackIdx, setStackIdx] = useState(0);
  const steps = getSteps(STACKS[stackIdx].packs);

  return (
    <section id="getting-started" className="py-24 px-4 md:px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Get Started in 60 Seconds
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Four commands. That&apos;s it. You&apos;re shipping with AI agents.
          </p>
        </motion.div>

        {/* Stack picker */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap gap-2 justify-center mb-8"
        >
          <span className="text-xs text-[#484f58] font-mono self-center mr-1">your stack:</span>
          {STACKS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStackIdx(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                stackIdx === i
                  ? "bg-[#d2a8ff] border-[#d2a8ff] text-[#0d1117]"
                  : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#d2a8ff]/50 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Steps */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {steps.map((step, i) => (
              <motion.div
                key={step.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                className="flex gap-4 items-start"
              >
                {/* Step number + connector */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#0d1117]"
                    style={{ background: STEP_COLORS[i] }}
                  >
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1 min-h-[24px]"
                      style={{ background: STEP_COLORS[i] + "40" }}
                    />
                  )}
                </div>

                {/* Card */}
                <div className="flex-1 pb-2">
                  <div className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden">
                    {/* Header row */}
                    <div
                      className="flex items-center justify-between px-4 py-2 border-b border-[#30363d]"
                      style={{ background: STEP_COLORS[i] + "12" }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: STEP_COLORS[i] }}
                      >
                        {step.label}
                      </span>
                      <span className="text-xs text-[#484f58]">{step.description}</span>
                    </div>

                    {/* Command */}
                    <div className="relative px-4 py-3 border-b border-[#21262d]">
                      <span className="font-mono text-xs md:text-sm">
                        <span className="text-[#484f58]">$ </span>
                        <span style={{ color: STEP_COLORS[i] }}>{step.code}</span>
                      </span>
                      <CopyButton text={step.code} />
                    </div>

                    {/* Output */}
                    <div className="px-4 py-2.5 font-mono text-xs text-[#3fb950] whitespace-pre leading-5">
                      {step.output}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl border border-[#30363d] bg-[#0d1117]"
            >
              <div
                className="text-2xl font-bold"
                style={{ color: STEP_COLORS[i] }}
              >
                {stat.value}
              </div>
              <div className="text-xs text-[#484f58] mt-1 font-mono">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <p className="text-center text-xs text-[#484f58] mt-5 font-mono">
          pick your stack above — step 2 updates automatically
        </p>
      </div>
    </section>
  );
}
