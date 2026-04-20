"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Rocket,
  Terminal,
  Settings,
  Puzzle,
  Shield,
  Network,
  Zap,
  ChevronRight,
} from "lucide-react";

const navItems = [
  {
    title: "Getting Started",
    icon: Rocket,
    href: "/docs/getting-started",
    description: "Installation and quick start",
  },
  {
    title: "Commands",
    icon: Terminal,
    href: "/docs/commands",
    description: "CLI reference",
  },
  {
    title: "Configuration",
    icon: Settings,
    href: "/docs/configuration",
    description: "Setup and customization",
  },
  {
    title: "Power Packs",
    icon: Puzzle,
    href: "/docs/power-packs",
    description: "Language and framework packs",
  },
  {
    title: "Security",
    icon: Shield,
    href: "/docs/security",
    description: "Guardrails and policies",
  },
  {
    title: "Knowledge Graph",
    icon: Network,
    href: "/docs/knowledge-graph",
    description: "Codebase visualization",
  },
  {
    title: "Token Savings",
    icon: Zap,
    href: "/docs/token-savings",
    description: "ROI, cost savings, real examples",
  },
  {
    title: "Architecture",
    icon: Zap,
    href: "/docs/architecture",
    description: "System design",
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d1117] sticky top-0 h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4">
        {/* Back to home link */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-sm mb-6"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Home
        </Link>

        {/* Section title */}
        <div className="flex items-center gap-2 px-3 mb-3">
          <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Documentation
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                  isActive
                    ? "bg-purple-100 dark:bg-purple-900/20 border-l-2 border-l-purple-600 dark:border-l-purple-400 -ml-[2px] pl-[calc(0.75rem-2px)]"
                    : "hover:bg-gray-100 dark:hover:bg-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0 mt-0.5",
                    isActive 
                      ? "text-purple-600 dark:text-purple-400" 
                      : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isActive 
                        ? "text-gray-900 dark:text-white" 
                        : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                    )}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
