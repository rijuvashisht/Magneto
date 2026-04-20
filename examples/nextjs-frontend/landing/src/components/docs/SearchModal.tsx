"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, FileText } from "lucide-react";
import Link from "next/link";

const docsIndex = [
  { title: "Getting Started", href: "/docs/getting-started", excerpt: "Installation, quick start, and your first task" },
  { title: "Commands", href: "/docs/commands", excerpt: "Complete CLI reference for all magneto commands" },
  { title: "Configuration", href: "/docs/configuration", excerpt: "Settings, runners, security modes, and environment variables" },
  { title: "Power Packs", href: "/docs/power-packs", excerpt: "Framework-specific packs for TypeScript, Next.js, React" },
  { title: "Security", href: "/docs/security", excerpt: "Guardrails, risk levels, approval workflows" },
  { title: "Knowledge Graph", href: "/docs/knowledge-graph", excerpt: "Visualize codebase architecture and dependencies" },
  { title: "Token Savings", href: "/docs/token-savings", excerpt: "ROI calculations, real examples: 54% token savings" },
  { title: "Architecture", href: "/docs/architecture", excerpt: "Five-layer system design and data flow" },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Would open search in parent component
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return docsIndex.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.excerpt.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
          <Search className="w-5 h-5 text-[#8b949e]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent text-white placeholder-[#8b949e] outline-none text-sm"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#30363d] text-[#8b949e]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="p-4 text-sm text-[#8b949e]">
              <p className="mb-2">Search for commands, configuration, or topics...</p>
              <div className="flex gap-2 flex-wrap">
                {["installation", "commands", "security", "configuration"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-2 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] hover:border-[#58a6ff] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-[#8b949e]">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => (
                <Link
                  key={result.href}
                  href={result.href}
                  onClick={onClose}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#0d1117] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#8b949e] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[#c9d1d9]">
                      {result.title}
                    </div>
                    <div className="text-xs text-[#8b949e] mt-0.5">
                      {result.excerpt}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0d1117] border-t border-[#30363d] text-xs text-[#8b949e] flex items-center justify-between">
          <span>{results.length} results</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
