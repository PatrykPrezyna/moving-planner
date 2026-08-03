import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { getSiteConfig } from "@/lib/config";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-stack", subsets: ["latin"] });

const serif = Instrument_Serif({
  variable: "--font-serif-stack",
  subsets: ["latin"],
  weight: "400",
});

export function generateMetadata(): Metadata {
  const config = getSiteConfig();
  return {
    title: config.title,
    description: config.intro,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7ede4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
