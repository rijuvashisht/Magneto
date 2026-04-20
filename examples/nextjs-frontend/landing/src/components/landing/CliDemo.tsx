"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const lines = [
  { text: "$ magneto init --with typescript nextjs", color: "#79c0ff", delay: 0 },
  { text: "[magneto] Initializing Magneto AI...", color: "#3fb950", delay: 800 },
  { text: "[magneto] ✓ Base scaffolding complete", color: "#3fb950", delay: 1200 },
  { text: "[magneto] ✓ Power packs loaded", color: "#3fb950", delay: 1600 },
  { text: "[magneto] ✓ Magneto AI initialized successfully!", color: "#3fb950", delay: 2000 },
  { text: "", color: "", delay: 2400 },
  { text: "$ magneto plan tasks/add-dashboard.md", color: "#79c0ff", delay: 2800 },
  { text: "[magneto] Planning task: add-dashboard", color: "#8b949e", delay: 3200 },
  { text: "[magneto] Classification: feature-implementation", color: "#d2a8ff", delay: 3600 },
  { text: "[magneto] Security Risk: low ✓", color: "#3fb950", delay: 4000 },
  { text: "[magneto] Agents: orchestrator, backend, frontend, tester", color: "#f0883e", delay: 4400 },
  { text: "[magneto] ✓ Plan saved to .magneto/cache/", color: "#3fb950", delay: 4800 },
  { text: "", color: "", delay: 5200 },
  { text: "$ magneto run tasks/add-dashboard.md --stream", color: "#79c0ff", delay: 5600 },
  { text: "[magneto] ⚡ Executing with 4 agents...", color: "#e3b341", delay: 6000 },
  { text: "[orchestrator] Decomposing into 3 subtasks...", color: "#d2a8ff", delay: 6400 },
  { text: "[backend] Implementing API routes... ████████░░ 80%", color: "#58a6ff", delay: 7000 },
  { text: "[tester] Generating test suite... ██████████ 100%", color: "#3fb950", delay: 7600 },
  { text: "[magneto] ✓ Task completed — 12 files, 847 lines, 31 tests", color: "#3fb950", delay: 8200 },
];

export default function CliDemo() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const timers: NodeJS.Timeout[] = [];
    lines.forEach((line, i) => {
      const timer = setTimeout(() => {
        setVisibleLines(i + 1);
      }, line.delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  return (
    <section className="py-32 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 px-6 py-10 mb-16 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            See It In Action
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            From init to shipped in under a minute. Watch the agents work.
          </p>
        </motion.div>

        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="rounded-xl overflow-hidden border border-[#30363d] bg-[#0d1117] shadow-2xl"
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
            <div className="w-3 h-3 rounded-full bg-[#f85149]" />
            <div className="w-3 h-3 rounded-full bg-[#e3b341]" />
            <div className="w-3 h-3 rounded-full bg-[#3fb950]" />
            <span className="ml-3 text-xs text-[#8b949e] font-mono">
              magneto — ~/my-project
            </span>
          </div>

          {/* Terminal content */}
          <div className="p-6 font-mono text-sm leading-7 min-h-[420px]">
            {lines.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{ color: line.color || "transparent" }}
                className="whitespace-pre"
              >
                {line.text || "\u00A0"}
              </motion.div>
            ))}
            {visibleLines < lines.length && (
              <span className="inline-block w-2 h-4 bg-[#58a6ff] animate-pulse" />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
