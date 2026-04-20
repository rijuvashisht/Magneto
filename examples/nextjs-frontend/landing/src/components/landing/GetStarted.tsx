"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

const codeSnippets = [
  {
    label: "Install",
    code: "npm install -g magneto-ai",
  },
  {
    label: "Initialize",
    code: "magneto init --with typescript nextjs",
  },
  {
    label: "Create Task",
    code: 'magneto task "Add user dashboard with charts"',
  },
  {
    label: "Execute",
    code: "magneto run tasks/add-user-dashboard.md --stream",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[#30363d] transition-colors text-[#8b949e] hover:text-[#c9d1d9]"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-[#3fb950]" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export default function GetStarted() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="getting-started" className="py-32 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Get Started in 60 Seconds
          </h2>
          <p className="text-[#8b949e] text-lg max-w-xl mx-auto">
            Four commands. That&apos;s it. You&apos;re shipping with AI agents.
          </p>
        </motion.div>

        <div className="space-y-4">
          {codeSnippets.map((snippet, i) => (
            <motion.div
              key={snippet.label}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className="relative group"
            >
              <div className="flex items-center gap-4">
                {/* Step number */}
                <div className="shrink-0 w-8 h-8 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center text-sm font-bold text-[#58a6ff]">
                  {i + 1}
                </div>

                {/* Code block */}
                <div className="flex-1 relative rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d]">
                    <span className="text-xs text-[#8b949e] font-medium">
                      {snippet.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 font-mono text-sm">
                    <span className="text-[#8b949e]">$ </span>
                    <span className="text-[#79c0ff]">{snippet.code}</span>
                  </div>
                  <CopyButton text={snippet.code} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { value: "3–5×", label: "Faster Delivery" },
            { value: "60%+", label: "Token Savings" },
            { value: "50+", label: "CLI Commands" },
            { value: "0", label: "Config Required" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-lg border border-[#30363d] bg-[#161b22]/50"
            >
              <div className="text-2xl font-bold text-[#58a6ff]">{stat.value}</div>
              <div className="text-xs text-[#8b949e] mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
