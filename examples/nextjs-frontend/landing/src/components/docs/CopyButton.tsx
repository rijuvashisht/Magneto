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
      className={`p-1.5 rounded-md hover:bg-[#30363d] transition-colors text-[#8b949e] hover:text-[#c9d1d9] ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-[#3fb950]" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
