import "./globals.css";
 fix/library-route
import type { Metadata } from "next";

 main

export const metadata = {
  title: "AG SEO Studio",
  description:
    "AI-powered SEO/GEO/AEO keyword intelligence and daily topic-to-blog generation.",
 fix/library-route
  openGraph: {
    title: "AG SEO Studio",
    description: "Daily topics → blog drafts → keyword sets (SEO/GEO/AEO).",
    type: "website",
  },

 main
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