"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Search, GitFork } from "lucide-react";
import { SearchModal } from "./SearchModal";

export function DocsHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-sm">
        <div className="flex h-16 items-center px-4 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-8">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span className="text-lg font-bold text-gray-900 dark:text-white hidden md:block">
              Magneto
            </span>
          </Link>

          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="text-gray-900 dark:text-gray-200">Documentation</span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            {/* Search */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search docs...</span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 text-xs">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/rijuvashisht/Magneto"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
