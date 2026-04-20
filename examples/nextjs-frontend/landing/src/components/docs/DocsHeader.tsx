"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Search, GitFork } from "lucide-react";
import { SearchModal } from "./SearchModal";

export function DocsHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur-sm">
        <div className="flex h-16 items-center px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-8">
            <Zap className="w-6 h-6 text-[#58a6ff]" />
            <span className="text-lg font-bold text-white hidden md:block">
              Magneto
            </span>
          </Link>

          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-[#8b949e]">
            <span className="text-[#c9d1d9]">Documentation</span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            {/* Search */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#161b22] text-sm text-[#8b949e] hover:border-[#58a6ff]/50 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search docs...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-xs">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/rijuvashisht/Magneto"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#30363d] hover:border-[#58a6ff]/50 text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
            >
              <GitFork className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
