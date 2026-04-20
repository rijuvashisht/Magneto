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
    <div className="relative my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Language indicator */}
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
            {language}
          </span>
          {filename && (
            <>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">{filename}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">Copied!</span>
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
        <pre className="p-4 text-sm font-mono whitespace-pre text-gray-800 dark:text-gray-200 leading-snug">
          {content}
        </pre>
      </div>
    </div>
  );
}
