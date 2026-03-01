import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rula Prospecting Agent",
  description: "AI-powered employer prospecting for Rula's AE sales motion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Figtree:wght@300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text">{children}</body>
    </html>
  );
}
