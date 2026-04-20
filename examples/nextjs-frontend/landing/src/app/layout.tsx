import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Magneto AI — AI Reasoning & Agent Control Plane",
  description: "Orchestrate multi-agent AI tasks with security guardrails, knowledge graphs, memory persistence, and streaming output. Ship features 3-5x faster.",
  openGraph: {
    title: "Magneto AI — AI Reasoning & Agent Control Plane",
    description: "Orchestrate multi-agent AI tasks with security guardrails, knowledge graphs, memory persistence, and streaming output.",
    type: "website",
    url: "https://github.com/rijuvashisht/Magneto",
  },
  twitter: {
    card: "summary_large_image",
    title: "Magneto AI",
    description: "AI Reasoning & Agent Control Plane",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
