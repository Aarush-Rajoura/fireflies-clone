import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Loaded once for the whole site; the app and marketing font stacks both read --font-inter.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fireflies.ai Clone",
  description: "Meeting transcripts, summaries and action items",
};

/*
 * Deliberately theme-neutral: the app's tokens and dark theme are applied by
 * the (app) route group's ThemeRoot, and the marketing site styles itself.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
