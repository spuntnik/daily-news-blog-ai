import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AG SEO Studio",
  description:
    "AI-powered SEO/GEO/AEO keyword intelligence and daily topic-to-blog generation.",
  openGraph: {
    title: "AG SEO Studio",
    description: "Daily topics → blog drafts → keyword sets (SEO/GEO/AEO).",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}