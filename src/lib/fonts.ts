import { Inter, JetBrains_Mono } from "next/font/google";

/**
 * Single source of truth for typography.
 *
 * Fonts are loaded once here and exposed as CSS variables so that Tailwind
 * (see `--font-sans` / `--font-mono` in globals.css) and any raw CSS use the
 * same faces. To swap a typeface, change it in this file only.
 *
 * `display: "swap"` keeps text visible during the font fetch; `variable`
 * avoids className plumbing through every component.
 */

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Used for prices, quantities and any tabular figures. */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;
