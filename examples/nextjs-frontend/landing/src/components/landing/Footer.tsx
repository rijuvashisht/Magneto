"use client";

import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-20 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0c]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">Magneto AI</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
              AI Reasoning & Agent Control Plane. Orchestrate multi-agent AI tasks
              with security guardrails, knowledge graphs, and memory persistence.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="https://github.com/rijuvashisht/Magneto#readme" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/issues" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Issues
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/magneto-ai" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  npm Package
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a href="https://github.com/rijuvashisht/Magneto" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Contributing
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  Changelog
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            MIT License — Copyright (c) 2024 Riju Vashisht
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.npmjs.com/package/magneto-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/npm/v/magneto-ai?style=flat-square&color=58a6ff&labelColor=161b22"
                alt="npm version"
                className="h-5"
              />
            </a>
            <a
              href="https://github.com/rijuvashisht/Magneto"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/github/stars/rijuvashisht/Magneto?style=flat-square&color=e3b341&labelColor=161b22"
                alt="GitHub stars"
                className="h-5"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
