import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fireflies.ai Clone",
  description: "Meeting transcripts, summaries and action items",
};

/*
 * Dark is the default theme (tokens on :root). The theme toggle switches by
 * setting `data-theme="light"` on <html>; suppressHydrationWarning lets a
 * pre-paint script change that attribute without a hydration mismatch.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
