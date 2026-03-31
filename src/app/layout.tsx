import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STEP - 日報・マネジメントサイクル統合SaaS",
  description: "毎日1STEP、チームが強くなる。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
