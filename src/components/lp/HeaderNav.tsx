"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-border py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">S</span>
          </div>
          <span className="text-[18px] font-semibold tracking-tight text-foreground">
            STEP
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <a href="#features" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            機能
          </a>
          <a href="#solution" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            導入効果
          </a>
          <a href="#contact" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            お問い合わせ
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 rounded-lg bg-foreground text-white text-[13px] font-medium hover:bg-foreground/85 transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}
