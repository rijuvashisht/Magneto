import type { MDXComponents } from 'mdx/types';
import * as React from 'react';
import { Mermaid } from '@/components/docs/Mermaid';

// Escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override headings with custom styling
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-white mt-8 mb-4 pb-2 border-b border-[#30363d]">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-white mt-6 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold text-white mt-4 mb-2">
        {children}
      </h4>
    ),
    // Paragraphs
    p: ({ children }) => (
      <p className="text-[#c9d1d9] leading-relaxed mb-4">
        {children}
      </p>
    ),
    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-[#c9d1d9] mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-[#c9d1d9] mb-4 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-[#c9d1d9]">
        {children}
      </li>
    ),
    // Code blocks - use raw HTML to preserve exact whitespace
    pre: ({ children }: { children?: React.ReactNode }) => {
      const codeElement = children as React.ReactElement<{ 
        children?: React.ReactNode; 
        className?: string;
      }>;
      
      // Extract language from className
      const className = codeElement?.props?.className || '';
      const language = className.replace('language-', '') || 'text';
      
      // Get raw text recursively
      const getRawText = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(getRawText).join('');
        if (React.isValidElement(node)) {
          return getRawText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
        }
        return '';
      };
      
      const rawCode = getRawText(codeElement?.props?.children);
      
      return (
        <div className="relative my-6 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs font-medium text-[#8b949e] uppercase">{language}</span>
          </div>
          <div className="overflow-x-auto">
            <pre 
              className="p-4 text-sm font-mono whitespace-pre text-[#c9d1d9] leading-snug"
              dangerouslySetInnerHTML={{ __html: escapeHtml(rawCode) }}
            />
          </div>
        </div>
      );
    },
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      // If it's inline code (no className), style it differently
      if (!className) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[#79c0ff] text-sm font-mono">
            {children}
          </code>
        );
      }
      // For code blocks, return as-is to be handled by pre
      return <code className={className}>{children}</code>;
    },
    // Links
    a: ({ children, href }) => (
      <a 
        href={href} 
        className="text-[#58a6ff] hover:text-[#79b8ff] hover:underline transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#58a6ff] pl-4 py-2 my-4 bg-[#161b22]/50 rounded-r-lg">
        <div className="text-[#8b949e] italic">
          {children}
        </div>
      </blockquote>
    ),
    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-[#30363d] rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-[#161b22]">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-[#30363d]">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-[#30363d]">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-[#30363d]">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-[#c9d1d9]">
        {children}
      </td>
    ),
    // Horizontal rule
    hr: () => (
      <hr className="my-8 border-[#30363d]" />
    ),
    // Strong and em
    strong: ({ children }) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-[#c9d1d9]">
        {children}
      </em>
    ),
    // Custom components
    Mermaid,
    ...components,
  };
}
