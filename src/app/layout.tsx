import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme/ThemeContext";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Guess the Crowd";
const description = "Think you know how people think? Predict the crowd, lock it in, and see how close you get.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * next/script's beforeInteractive strategy (not a raw <script> tag —
         * React 19 errors on those when rendered as a JSX element) always
         * gets hoisted into <head> and runs before hydration, regardless of
         * where it's placed here. That's what avoids a flash of the wrong
         * theme for a returning player with a stored preference.
         */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
