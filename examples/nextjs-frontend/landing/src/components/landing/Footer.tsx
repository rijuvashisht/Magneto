"use client";

import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#30363d] bg-[#0d1117]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-[#58a6ff]" />
              <span className="text-lg font-bold text-white">Magneto AI</span>
            </div>
            <p className="text-sm text-[#8b949e] leading-relaxed max-w-md">
              AI Reasoning & Agent Control Plane. Orchestrate multi-agent AI tasks
              with security guardrails, knowledge graphs, and memory persistence.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-[#8b949e]">
              <li>
                <a href="https://github.com/rijuvashisht/Magneto#readme" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/issues" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  Issues
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/magneto-ai" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  npm Package
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-[#8b949e]">
              <li>
                <a href="https://github.com/rijuvashisht/Magneto" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  Contributing
                </a>
              </li>
              <li>
                <a href="https://github.com/rijuvashisht/Magneto/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
                  Changelog
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#30363d] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#8b949e]">
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
