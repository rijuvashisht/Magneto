import { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsHeader } from "@/components/docs/DocsHeader";
import { TableOfContents } from "@/components/docs/TableOfContents";

export const metadata: Metadata = {
  title: "Documentation — Magneto AI",
  description: "Complete documentation for Magneto AI - AI Reasoning & Agent Control Plane",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <DocsHeader />
      <div className="flex">
        <DocsSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-8 md:py-12">
            {children}
          </div>
        </main>
        <aside className="shrink-0 w-64 hidden xl:block">
          <TableOfContents />
        </aside>
      </div>
    </div>
  );
}
