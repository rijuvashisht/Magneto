"use client";

import { useState, ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code?: string;
  language?: string;
  filename?: string;
  children?: ReactNode;
}

export function CodeBlock({ code, language = "text", filename, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Use children if provided (from MDX), otherwise use code prop
  const content = children || code || '';

  const handleCopy = () => {
    const textToCopy = typeof content === 'string' ? content : '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          {/* Language indicator */}
          <span className="text-xs font-medium text-[#8b949e] uppercase">
            {language}
          </span>
          {filename && (
            <>
              <span className="text-[#484f58]">|</span>
              <span className="text-xs text-[#c9d1d9]">{filename}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#3fb950]" />
              <span className="text-[#3fb950]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono whitespace-pre text-[#c9d1d9] leading-snug">
          {content}
        </pre>
      </div>
    </div>
  );
}
