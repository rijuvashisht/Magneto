import type { MDXComponents } from 'mdx/types';
import * as React from 'react';
import { Mermaid } from '@/components/docs/Mermaid';
import { CopyButton } from '@/components/docs/CopyButton';

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 tracking-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3 tracking-tight">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
        {children}
      </h4>
    ),
    // Paragraphs
    p: ({ children }) => (
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {children}
      </p>
    ),
    // Lists
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-700 dark:text-gray-300">
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
        <div className="relative my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0d1117]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{language}</span>
            <CopyButton text={rawCode} />
          </div>
          <div className="overflow-x-auto">
            <pre 
              className="p-4 text-sm font-mono whitespace-pre text-gray-800 dark:text-gray-200 leading-snug"
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
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 text-purple-700 dark:text-purple-400 text-sm font-mono">
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
        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-900/50 rounded-r-lg">
        <div className="text-gray-600 dark:text-gray-400 italic">
          {children}
        </div>
      </blockquote>
    ),
    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-800 rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100 dark:bg-gray-900">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-gray-200 dark:border-gray-800">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {children}
      </td>
    ),
    // Horizontal rule
    hr: () => (
      <hr className="my-8 border-gray-200 dark:border-gray-800" />
    ),
    // Strong and em
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900 dark:text-white">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-700 dark:text-gray-300">
        {children}
      </em>
    ),
    // Custom components
    Mermaid,
    ...components,
  };
}
