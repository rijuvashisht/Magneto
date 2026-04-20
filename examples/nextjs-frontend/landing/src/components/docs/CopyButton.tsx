"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label="Copy to clipboard"
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
  );
}
