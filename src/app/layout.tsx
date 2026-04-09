import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0D9488",
};

export const metadata: Metadata = {
  title: "STEP - 日報が届かないを、なくす | マネジメントサイクル統合プラットフォーム",
  description:
    "日報・目標管理・案件管理をひとつに統合。提出30秒、全員の状況を一画面で把握。人材紹介・派遣業のチームを仕組みで強くするプラットフォーム。5名まで無料。",
  manifest: "/manifest.json",
  openGraph: {
    title: "STEP - 日報が届かないを、なくす",
    description:
      "日報・目標管理・案件管理をひとつに統合。提出30秒、全員の状況を一画面で把握。人材紹介・派遣業のチームを仕組みで強くするプラットフォーム。",
    type: "website",
    locale: "ja_JP",
    siteName: "STEP",
  },
  twitter: {
    card: "summary_large_image",
    title: "STEP - 日報が届かないを、なくす",
    description:
      "日報・目標管理・案件管理をひとつに統合。人材紹介・派遣業のチームを仕組みで強くするプラットフォーム。",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "STEP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <head>
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Self-hosted fonts via Google Fonts CDN with display=swap for performance */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=BIZ+UDPGothic:wght@400;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
