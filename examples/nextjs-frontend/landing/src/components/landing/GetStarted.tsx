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
      className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
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
          className="relative rounded-3xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 px-6 py-10 mb-16 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Get Started in 60 Seconds
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
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
                <div className="shrink-0 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
                  {i + 1}
                </div>

                {/* Code block */}
                <div className="flex-1 relative rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 backdrop-blur-md overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/40">
                    <span className="text-xs text-gray-700 dark:text-gray-400 font-semibold">
                      {snippet.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 font-mono text-sm">
                    <span className="text-gray-500 dark:text-gray-500">$ </span>
                    <span className="text-purple-700 dark:text-purple-400 font-medium">{snippet.code}</span>
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
              className="text-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-black/40 backdrop-blur-md"
            >
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stat.value}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
