import "./globals.css";

export const metadata = {
  title: "AG SEO Studio",
  description:
    "AI-powered SEO/GEO/AEO keyword intelligence and daily topic-to-blog generation.",
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
