import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "@fontsource/caladea/700.css";
import "@fontsource/carlito/400.css";
import "@fontsource/carlito/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Squigglr",
  description: "Guided drawing practice for young children.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
