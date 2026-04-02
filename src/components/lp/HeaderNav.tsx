"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="text-xl font-bold text-white">STEP</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
            機能
          </a>
          <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">
            料金
          </a>
          <a href="mailto:sales@step-app.jp" className="text-sm text-white/60 hover:text-white transition-colors">
            お問い合わせ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}
