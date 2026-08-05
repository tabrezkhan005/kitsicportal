import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Roboto,
  Syne,
} from "next/font/google";
import { ThemeProvider } from "@kitsic/ui";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Innovation Club | KITS Guntur",
    template: "%s | KITSIC Dashboard",
  },
  description:
    "Innovation Club at KITS Guntur — your club operating system for tasks, events, and innovation.",
  openGraph: {
    title: "Innovation Club | KITS Guntur",
    description:
      "A world-class technical community at KITS Guntur focused on innovation, engineering, and leadership.",
    type: "website",
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
      className={`light ${roboto.variable} ${syne.variable} ${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-body antialiased">
        <ThemeProvider>
          <Providers>{children}</Providers>
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  "rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-elevated)] font-ui",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
