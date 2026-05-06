import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppNavigation } from "@/components/app-navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Email Labeling Dashboard",
  description: "Local-first labeling dashboard for university email relevance classification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const storageKey = "ml-labeling-theme";
                const stored = window.localStorage.getItem(storageKey);
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
                const root = document.documentElement;
                root.classList.toggle("dark", theme === "dark");
                root.style.colorScheme = theme;
              })();
            `,
          }}
        />
        <div className="min-h-full">
          <AppNavigation />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
