import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TP Report - Transfer Pricing Compliance, Automated",
  description:
    "Built for Indian CAs managing multi-entity clients. Generate compliant TP documentation, functional analysis, and intragroup agreements — without the Big Four price tag.",
  keywords: [
    "transfer pricing",
    "chartered accountant",
    "India",
    "TP documentation",
    "CBDT",
    "OECD",
    "compliance",
    "functional analysis",
    "intragroup agreements",
  ],
  authors: [{ name: "TP Report" }],
  openGraph: {
    title: "TP Report - Transfer Pricing Compliance, Automated",
    description:
      "Built for Indian CAs managing multi-entity clients. Generate compliant TP documentation, functional analysis, and intragroup agreements.",
    type: "website",
    locale: "en_IN",
    siteName: "TP Report",
  },
  twitter: {
    card: "summary_large_image",
    title: "TP Report - Transfer Pricing Compliance, Automated",
    description:
      "Built for Indian CAs managing multi-entity clients. Generate compliant TP documentation and functional analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
