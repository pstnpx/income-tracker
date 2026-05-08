import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const roboto = Roboto({ variable: "--font-sans", subsets: ["latin"], weight: ["300", "400", "500", "700"] });

export const metadata: Metadata = {
  title: "Income Dashboard 2026",
  description: "Personal income & stock tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} antialiased`} suppressHydrationWarning>
      <body className="bg-background min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
