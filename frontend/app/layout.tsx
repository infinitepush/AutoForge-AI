import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoForge AI — Prompt-to-3D Vehicle Engineering",
  description:
    "Describe any vehicle in natural language. AutoForge AI converts it into structured engineering parameters and opens an interactive 3D digital twin configurator.",
  keywords: ["vehicle configurator", "3D car design", "AI vehicle", "automotive digital twin"],
  openGraph: {
    title: "AutoForge AI",
    description: "Prompt-to-3D Vehicle Engineering Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
