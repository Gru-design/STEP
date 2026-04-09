"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      // Show after scrolling past hero, hide near footer
      setVisible(scrollY > 500 && scrollY < docHeight - viewHeight - 300);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Link
          href="/signup"
          className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary-hover transition-colors"
        >
          無料で試してみる
        </Link>
      </div>
    </div>
  );
}
