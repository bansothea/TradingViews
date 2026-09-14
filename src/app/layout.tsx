import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pulse Signals",
    template: "%s · Pulse Signals",
  },
  description: "AI-powered crypto trading signals",
  icons: { icon: "/brand/logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variables live on <html> so tokens in globals.css can resolve them.
    // The base surface is light (auth, marketing); the dashboard opts into
    // dark on its own wrapper.
    <html lang="en" className={fontVariables}>
      <body className="bg-surface text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
