"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings?: Heading[];
}

export function TableOfContents({ headings: propHeadings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [headings, setHeadings] = useState<Heading[]>([]);
  const pathname = usePathname();

  // Extract headings from the page if not provided
  useEffect(() => {
    if (propHeadings) {
      setHeadings(propHeadings);
      return;
    }

    const extractHeadings = () => {
      const elements = document.querySelectorAll("h1, h2, h3");
      const extracted: Heading[] = [];

      elements.forEach((el) => {
        const id = el.id || el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (id && !el.id) {
          el.id = id;
        }
        extracted.push({
          id: id || "",
          text: el.textContent || "",
          level: parseInt(el.tagName[1]),
        });
      });

      setHeadings(extracted);
    };

    extractHeadings();

    // Re-extract when content changes (for client-side navigation)
    const observer = new MutationObserver(extractHeadings);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [propHeadings]);

  // Track active heading based on scroll position and URL hash
  useEffect(() => {
    // Check for URL hash on load
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveId(hash);
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }

    const handleScroll = () => {
      const headingElements = headings
        .map((h) => document.getElementById(h.id))
        .filter(Boolean) as HTMLElement[];

      if (headingElements.length === 0) return;

      const scrollPosition = window.scrollY + 100;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const heading = headingElements[i];
        if (heading.offsetTop <= scrollPosition) {
          setActiveId(heading.id);
          // Update URL hash without triggering scroll
          const newUrl = `${pathname}#${heading.id}`;
          window.history.replaceState(null, "", newUrl);
          return;
        }
      }

      setActiveId(headingElements[0]?.id || "");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings, pathname]);

  if (headings.length <= 1) return null;

  return (
    <nav className="sticky top-20 w-64 shrink-0 hidden xl:block">
      <div className="border-l border-gray-200 dark:border-gray-800 pl-4">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
          On this page
        </p>
        <ul className="space-y-1">
          {headings.map((heading) => (
            <li key={heading.id}>
              <Link
                href={`${pathname}#${heading.id}`}
                className={cn(
                  "text-left text-sm transition-colors hover:text-gray-900 dark:hover:text-gray-200 block",
                  heading.level === 1 && "font-medium",
                  heading.level === 2 && "pl-2",
                  heading.level === 3 && "pl-4",
                  activeId === heading.id
                    ? "text-purple-600 dark:text-purple-400 font-medium"
                    : "text-gray-600 dark:text-gray-400"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(heading.id);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                    window.history.pushState(null, "", `${pathname}#${heading.id}`);
                    setActiveId(heading.id);
                  }
                }}
              >
                {heading.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
