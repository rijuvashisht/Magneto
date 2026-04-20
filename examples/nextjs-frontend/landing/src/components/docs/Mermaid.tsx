"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#0d1117",
        primaryColor: "#161b22",
        primaryTextColor: "#c9d1d9",
        primaryBorderColor: "#30363d",
        lineColor: "#58a6ff",
        secondaryColor: "#21262d",
        tertiaryColor: "#161b22",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "14px",
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
      sequence: {
        useMaxWidth: true,
      },
    });
  }, []);

  useEffect(() => {
    if (!chart || !ref.current) return;

    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart.trim());
        setSvg(svg);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    render();
  }, [chart]);

  if (error) {
    return (
      <div className="my-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
        <p className="font-semibold mb-1">Diagram Error</p>
        <pre className="text-xs overflow-x-auto">{error}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <span className="text-xs font-medium text-[#8b949e] uppercase">Diagram</span>
      </div>
      <div 
        ref={ref}
        className="p-4 overflow-x-auto flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
