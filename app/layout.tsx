import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bharat Intelligence — National Ontology Engine",
  description:
    "India's AI-powered National Decision Intelligence Infrastructure. Unified strategic insights across geopolitics, economics, defense, technology, climate, and society.",
  keywords: "India, AI, national intelligence, geopolitics, economics, defense, government, NITI Aayog",
  openGraph: {
    title: "Bharat Intelligence — National Ontology Engine",
    description: "India's AI-powered national decision intelligence platform.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Font preconnects */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Fonts */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        {/* Satoshi via Fontshare */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,800,700,500,400&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

