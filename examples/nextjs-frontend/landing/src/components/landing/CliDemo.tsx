"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

type Line = { text: string; color: string; delay: number };

const SCENARIOS: {
  id: string;
  label: string;
  emoji: string;
  subtitle: string;
  lines: Line[];
}[] = [
  {
    id: "nextjs",
    label: "Next.js Feature",
    emoji: "🖥",
    subtitle: "Ship a dashboard with 4 parallel agents",
    lines: [
      { text: "$ magneto init --with typescript nextjs", color: "#79c0ff", delay: 0 },
      { text: "[magneto] ✓ Detected: TypeScript · Next.js 14 · React 18", color: "#3fb950", delay: 700 },
      { text: "[magneto] ✓ Power packs loaded  (typescript, nextjs)", color: "#3fb950", delay: 1200 },
      { text: "[magneto] ✓ Magneto AI initialized!", color: "#3fb950", delay: 1700 },
      { text: "", color: "", delay: 2100 },
      { text: "$ magneto plan tasks/add-dashboard.md", color: "#79c0ff", delay: 2500 },
      { text: "[magneto] Classification: feature-implementation", color: "#d2a8ff", delay: 3000 },
      { text: "[magneto] Security Risk: low ✓", color: "#3fb950", delay: 3400 },
      { text: "[magneto] Agents: orchestrator, backend, frontend, tester", color: "#f0883e", delay: 3800 },
      { text: "", color: "", delay: 4200 },
      { text: "$ magneto run tasks/add-dashboard.md --stream", color: "#79c0ff", delay: 4600 },
      { text: "[magneto] ⚡ Executing with 4 agents in parallel...", color: "#e3b341", delay: 5100 },
      { text: "[backend]   Implementing API routes...         ████████░░  80%", color: "#58a6ff", delay: 5700 },
      { text: "[frontend]  Building dashboard components...  ██████░░░░  60%", color: "#58a6ff", delay: 6100 },
      { text: "[tester]    Generating test suite...           ██████████ 100%", color: "#3fb950", delay: 6600 },
      { text: "[frontend]  Components complete ✓", color: "#3fb950", delay: 7100 },
      { text: "[backend]   API routes complete ✓", color: "#3fb950", delay: 7500 },
      { text: "[magneto] ✓ Done — 12 files · 847 lines · 31 tests", color: "#3fb950", delay: 8000 },
      { text: "  ⚠  Caught: missing 'use client' on useState component", color: "#e3b341", delay: 8500 },
    ],
  },
  {
    id: "fastapi",
    label: "Python FastAPI",
    emoji: "🐍",
    subtitle: "Catch 5 security issues before deploy",
    lines: [
      { text: "$ magneto init --with python fastapi", color: "#79c0ff", delay: 0 },
      { text: "[magneto] ✓ Detected: Python 3.12 · FastAPI 0.110 · Pydantic v2", color: "#3fb950", delay: 700 },
      { text: "[magneto] ✓ Power packs loaded  (python, fastapi)", color: "#3fb950", delay: 1200 },
      { text: "", color: "", delay: 1600 },
      { text: "$ magneto run tasks/pre-deploy-audit.md --mode observe", color: "#79c0ff", delay: 2000 },
      { text: "[magneto] ⚡ Security audit (observe — read-only)... 24 files", color: "#e3b341", delay: 2600 },
      { text: "", color: "", delay: 3000 },
      { text: "[python-pack]  py-hardcoded-secret    FOUND  src/config.py:14", color: "#f85149", delay: 3400 },
      { text: "               → SECRET_KEY = \"my-super-secret-key\"", color: "#8b949e", delay: 3800 },
      { text: "[python-pack]  py-shell-true          FOUND  src/utils/runner.py:38", color: "#f85149", delay: 4200 },
      { text: "               → subprocess.run(cmd, shell=True)", color: "#8b949e", delay: 4600 },
      { text: "[fastapi-pack] fastapi-cors-wildcard  FOUND  src/main.py:22", color: "#f85149", delay: 5000 },
      { text: "               → allow_origins=[\"*\"] + allow_credentials=True", color: "#8b949e", delay: 5400 },
      { text: "[fastapi-pack] fastapi-debug-true     FOUND  src/main.py:7", color: "#e3b341", delay: 5800 },
      { text: "[python-pack]  py-requests-no-timeout FOUND  src/integrations/stripe.py:51", color: "#e3b341", delay: 6200 },
      { text: "", color: "", delay: 6600 },
      { text: "[magneto] ✗ 5 issues · 3 error · 2 warning — deploy blocked", color: "#f85149", delay: 7000 },
      { text: "[magneto] ✓ Report → .magneto/reports/pre-deploy-audit.md", color: "#3fb950", delay: 7500 },
    ],
  },
  {
    id: "springboot",
    label: "Java Spring Boot",
    emoji: "☕",
    subtitle: "Fix N+1 queries and exposed actuator",
    lines: [
      { text: "$ magneto init --with java spring-boot", color: "#79c0ff", delay: 0 },
      { text: "[magneto] ✓ Detected: Java 21 · Spring Boot 3.2 · PostgreSQL", color: "#3fb950", delay: 700 },
      { text: "[magneto] ✓ Power packs loaded  (java, spring-boot)", color: "#3fb950", delay: 1200 },
      { text: "", color: "", delay: 1600 },
      { text: "$ magneto run tasks/perf-audit.md --mode observe --stream", color: "#79c0ff", delay: 2000 },
      { text: "[magneto] ⚡ Scanning 67 Java files...", color: "#e3b341", delay: 2500 },
      { text: "", color: "", delay: 2900 },
      { text: "[spring-pack] spring-open-in-view         FOUND  application.yml:12", color: "#f85149", delay: 3300 },
      { text: "              → open-in-view=true  ← N+1 queries in every controller", color: "#8b949e", delay: 3700 },
      { text: "[spring-pack] spring-transactional-priv   FOUND  OrderService.java:84", color: "#f85149", delay: 4100 },
      { text: "              → @Transactional on private method ← proxy bypass", color: "#8b949e", delay: 4500 },
      { text: "[spring-pack] spring-actuator-all-exposed FOUND  application-prod.yml:4", color: "#f85149", delay: 4900 },
      { text: "              → exposure.include=*  ← heapdump publicly accessible", color: "#8b949e", delay: 5300 },
      { text: "[java-pack]   java-unsafe-deserialize     FOUND  MessageParser.java:33", color: "#f85149", delay: 5700 },
      { text: "              → new ObjectInputStream(input)  ← RCE risk", color: "#8b949e", delay: 6100 },
      { text: "", color: "", delay: 6500 },
      { text: "[magneto] ✓ Found 4 issues — orchestrating fixes...", color: "#e3b341", delay: 6900 },
      { text: "[backend]  Fixing application.yml + OrderService...  ██████████ 100%", color: "#3fb950", delay: 7500 },
      { text: "[magneto] ✓ 6 files changed — est. 60-80% DB query reduction", color: "#3fb950", delay: 8100 },
    ],
  },
  {
    id: "aws",
    label: "AWS Infrastructure",
    emoji: "☁️",
    subtitle: "Block a dangerous Terraform deploy",
    lines: [
      { text: "$ magneto init --with aws", color: "#79c0ff", delay: 0 },
      { text: "[magneto] ✓ Detected: Terraform 1.7 · AWS Provider 5.x", color: "#3fb950", delay: 700 },
      { text: "[magneto] ✓ Power packs loaded  (aws)", color: "#3fb950", delay: 1200 },
      { text: "", color: "", delay: 1600 },
      { text: "$ magneto run tasks/infra-pre-deploy.md --mode observe", color: "#79c0ff", delay: 2000 },
      { text: "[magneto] ⚡ Scanning 31 Terraform files...", color: "#e3b341", delay: 2500 },
      { text: "", color: "", delay: 2900 },
      { text: "[aws-pack] aws-iam-wildcard-action  FOUND  infra/iam.tf:18", color: "#f85149", delay: 3300 },
      { text: "           → Action: \"*\", Resource: \"*\"  ← all AWS permissions", color: "#8b949e", delay: 3700 },
      { text: "[aws-pack] aws-s3-public-acl        FOUND  infra/storage.tf:7", color: "#f85149", delay: 4100 },
      { text: "           → acl = \"public-read\"  ← bucket publicly accessible", color: "#8b949e", delay: 4500 },
      { text: "[aws-pack] aws-sg-ssh-open          FOUND  infra/networking.tf:44", color: "#f85149", delay: 4900 },
      { text: "           → 0.0.0.0/0 on port 22  ← SSH open to internet", color: "#8b949e", delay: 5300 },
      { text: "[aws-pack] aws-hardcoded-access-key FOUND  infra/providers.tf:11", color: "#f85149", delay: 5700 },
      { text: "           → access_key = \"AKIA...\"  ← rotate immediately!", color: "#f85149", delay: 6100 },
      { text: "[aws-pack] aws-rds-unencrypted      FOUND  infra/database.tf:29", color: "#e3b341", delay: 6500 },
      { text: "[aws-pack] aws-lambda-no-timeout    FOUND  infra/lambda.tf:8", color: "#e3b341", delay: 6900 },
      { text: "", color: "", delay: 7300 },
      { text: "[magneto] ✗ 6 CRITICAL/HIGH issues — deploy blocked", color: "#f85149", delay: 7700 },
      { text: "[magneto] ✓ Report → .magneto/reports/infra-pre-deploy.md", color: "#3fb950", delay: 8200 },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (Zero Egress)",
    emoji: "🔒",
    subtitle: "Full AI reasoning — nothing leaves your machine",
    lines: [
      { text: "$ ollama pull qwen2.5-coder && ollama serve", color: "#79c0ff", delay: 0 },
      { text: "$ export OLLAMA_HOST=http://localhost:11434", color: "#79c0ff", delay: 700 },
      { text: "$ export OLLAMA_MODEL=qwen2.5-coder", color: "#79c0ff", delay: 1100 },
      { text: "", color: "", delay: 1500 },
      { text: "$ magneto run tasks/audit-auth-module.md --runner ollama --stream", color: "#79c0ff", delay: 1900 },
      { text: "[magneto] Runner:      ollama (qwen2.5-coder @ localhost)", color: "#d2a8ff", delay: 2500 },
      { text: "[magneto] Data egress: none ✓  — all processing is local", color: "#3fb950", delay: 2900 },
      { text: "[magneto] ⚡ Pre-flight health check...", color: "#e3b341", delay: 3400 },
      { text: "[magneto] ✓ Ollama reachable · model qwen2.5-coder available", color: "#3fb950", delay: 3900 },
      { text: "", color: "", delay: 4300 },
      { text: "[ollama]  Analyzing auth module (4 files, 612 lines)... ████████████ 100%", color: "#58a6ff", delay: 4700 },
      { text: "", color: "", delay: 5500 },
      { text: "[magneto] ✓ Task complete", color: "#3fb950", delay: 5900 },
      { text: "          Findings: 4 · Risks: 1 · Tokens: 2,847", color: "#8b949e", delay: 6300 },
      { text: "          metadata.dataEgress = \"none\"  ← audit-ready", color: "#3fb950", delay: 6700 },
      { text: "", color: "", delay: 7100 },
      { text: "$ cat .magneto/audit/approvals.json | jq '.[-1].metadata.dataEgress'", color: "#79c0ff", delay: 7500 },
      { text: "\"none\"", color: "#3fb950", delay: 8100 },
    ],
  },
  {
    id: "autodetect",
    label: "Auto-Detect Stack",
    emoji: "🔍",
    subtitle: "Zero config — Magneto figures it out",
    lines: [
      { text: "$ magneto detect", color: "#79c0ff", delay: 0 },
      { text: "[magneto] Scanning project structure...", color: "#8b949e", delay: 600 },
      { text: "", color: "", delay: 1000 },
      { text: "Stack detected:", color: "#e3b341", delay: 1400 },
      { text: "  ✓ TypeScript   confidence: 0.98  (tsconfig.json, 47 .ts files)", color: "#3fb950", delay: 1800 },
      { text: "  ✓ Next.js      confidence: 0.95  (next.config.js, app/ router)", color: "#3fb950", delay: 2200 },
      { text: "  ✓ Python       confidence: 0.81  (requirements.txt, 12 .py files)", color: "#3fb950", delay: 2600 },
      { text: "  ✓ FastAPI      confidence: 0.79  (fastapi in requirements.txt)", color: "#3fb950", delay: 3000 },
      { text: "  ✓ AWS          confidence: 0.92  (14 .tf files, aws provider)", color: "#3fb950", delay: 3400 },
      { text: "", color: "", delay: 3800 },
      { text: "Recommended packs:", color: "#e3b341", delay: 4200 },
      { text: "  → typescript  [available]", color: "#58a6ff", delay: 4600 },
      { text: "  → nextjs      [available]", color: "#58a6ff", delay: 4900 },
      { text: "  → python      [available]", color: "#58a6ff", delay: 5200 },
      { text: "  → fastapi     [available]", color: "#58a6ff", delay: 5500 },
      { text: "  → aws         [available]", color: "#58a6ff", delay: 5800 },
      { text: "", color: "", delay: 6100 },
      { text: "$ magneto init --auto-install", color: "#79c0ff", delay: 6500 },
      { text: "[magneto] Installing all 5 detected packs...", color: "#8b949e", delay: 7100 },
      { text: "[magneto] ✓ typescript · nextjs · python · fastapi · aws installed", color: "#3fb950", delay: 7700 },
      { text: "[magneto] ✓ Magneto AI ready — 67 checks active across your stack", color: "#3fb950", delay: 8300 },
    ],
  },
];

function Terminal({ lines, isPlaying }: { lines: Line[]; isPlaying: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!isPlaying) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, i) => {
      const t = setTimeout(() => setVisibleCount(i + 1), line.delay + 300);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [isPlaying, lines]);

  return (
    <div className="p-5 font-mono text-xs md:text-sm leading-6 md:leading-7 min-h-[400px] overflow-y-auto">
      <AnimatePresence initial={false}>
        {lines.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            style={{ color: line.color || "transparent" }}
            className="whitespace-pre"
          >
            {line.text || "\u00A0"}
          </motion.div>
        ))}
      </AnimatePresence>
      {visibleCount < lines.length && isPlaying && (
        <span className="inline-block w-2 h-4 bg-[#58a6ff] animate-pulse ml-0.5" />
      )}
    </div>
  );
}

export default function CliDemo() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (isInView) setPlayKey((k) => k + 1);
  }, [isInView]);

  const handleTabClick = useCallback((id: string) => {
    setActiveId(id);
    setPlayKey((k) => k + 1);
  }, []);

  const active = SCENARIOS.find((s) => s.id === activeId)!;

  return (
    <section className="py-24 px-4 md:px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            See It In Action
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Pick your stack. Watch Magneto work.
          </p>
        </motion.div>

        {/* Scenario tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-wrap gap-2 justify-center mb-6"
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleTabClick(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                activeId === s.id
                  ? "bg-[#58a6ff] border-[#58a6ff] text-[#0d1117] shadow-lg shadow-[#58a6ff]/20"
                  : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/50 hover:text-white"
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Active scenario subtitle */}
        <motion.p
          key={activeId + "-sub"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-[#8b949e] mb-4 font-mono"
        >
          {active.subtitle}
        </motion.p>

        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="rounded-xl overflow-hidden border border-[#30363d] bg-[#0d1117] shadow-2xl"
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
            <div className="w-3 h-3 rounded-full bg-[#f85149]" />
            <div className="w-3 h-3 rounded-full bg-[#e3b341]" />
            <div className="w-3 h-3 rounded-full bg-[#3fb950]" />
            <span className="ml-3 text-xs text-[#8b949e] font-mono flex-1">
              magneto — ~/my-project
            </span>
            {/* Replay button */}
            <button
              onClick={() => setPlayKey((k) => k + 1)}
              className="text-[#8b949e] hover:text-white transition-colors text-xs font-mono flex items-center gap-1 px-2 py-0.5 rounded border border-[#30363d] hover:border-[#58a6ff]/50"
              title="Replay"
            >
              ↺ replay
            </button>
          </div>

          {/* Terminal body — keyed to force remount on tab switch */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId + "-" + playKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Terminal lines={active.lines} isPlaying={true} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Hint */}
        <p className="text-center text-xs text-[#484f58] mt-4 font-mono">
          click a scenario tab to switch · ↺ to replay
        </p>
      </div>
    </section>
  );
}
