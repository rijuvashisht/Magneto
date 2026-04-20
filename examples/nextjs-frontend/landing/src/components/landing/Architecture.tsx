"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const layers = [
  {
    name: "CLI Layer",
    items: ["magneto init", "magneto plan", "magneto run", "magneto graph"],
    color: "#58a6ff",
    y: 0,
  },
  {
    name: "Orchestration",
    items: ["Task Classifier", "Agent Spawner", "Result Merger", "Security Engine"],
    color: "#d2a8ff",
    y: 1,
  },
  {
    name: "Agent Layer",
    items: ["Orchestrator", "Backend", "Tester", "Requirements"],
    color: "#3fb950",
    y: 2,
  },
  {
    name: "Intelligence",
    items: ["Knowledge Graph", "Memory Store", "Checkpoints", "Telepathy"],
    color: "#f0883e",
    y: 3,
  },
  {
    name: "Runners",
    items: ["OpenAI", "Copilot Local", "Copilot Cloud", "Custom"],
    color: "#f85149",
    y: 4,
  },
];

export default function Architecture() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 px-6 bg-transparent" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 px-6 py-10 mb-20 text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Architecture
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Five layers, one command. Every piece works together.
          </p>
        </motion.div>

        <div className="space-y-4">
          {layers.map((layer, layerIdx) => (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, x: layerIdx % 2 === 0 ? -40 : 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: layerIdx * 0.15, duration: 0.5 }}
              className="relative"
            >
              <div
                className="rounded-xl border p-5 bg-white/60 dark:bg-black/40 backdrop-blur-md"
                style={{ borderColor: layer.color + "60" }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  {/* Layer label */}
                  <div
                    className="shrink-0 w-36 text-sm font-semibold px-3 py-1 rounded-md text-center"
                    style={{
                      color: layer.color,
                      background: layer.color + "15",
                    }}
                  >
                    {layer.name}
                  </div>

                  {/* Items */}
                  <div className="flex flex-wrap gap-2 flex-1">
                    {layer.items.map((item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{
                          delay: layerIdx * 0.15 + i * 0.05 + 0.2,
                          duration: 0.3,
                        }}
                        className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-black/60 text-gray-800 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Connector arrow */}
              {layerIdx < layers.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-700" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
