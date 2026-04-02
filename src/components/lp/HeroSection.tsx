import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a1a] pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-color/15 blur-[120px]" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[80px]" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              日報提出率 95%以上を実現するプラットフォーム
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.15] mb-6">
              毎日1STEP、
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-muted bg-clip-text text-transparent">
                チームが強くなる。
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-10 max-w-lg leading-relaxed">
              日報・目標・案件・計画・ナレッジを統合。
              <br className="hidden md:block" />
              ゲーミフィケーションで習慣化し、
              <br className="hidden md:block" />
              マネジメントサイクルを自動で回す。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-hover transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.4)]"
              >
                無料で始める
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-colors"
              >
                機能を見る
              </a>
            </div>
            <p className="mt-6 text-sm text-white/40">
              5ユーザーまで永久無料 / クレジットカード不要 / 最短30分で運用開始
            </p>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-1 shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white/10 rounded-md px-3 py-1 text-xs text-white/40 text-center">
                    app.step-saas.jp/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "提出率", value: "96%", color: "text-primary" },
                    { label: "今週のXP", value: "+280", color: "text-accent-color" },
                    { label: "ストリーク", value: "14日", color: "text-success" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-[10px] text-white/40">{stat.label}</p>
                      <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart mockup */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-white/40 mb-3">チーム提出状況</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {[65, 80, 45, 90, 75, 95, 88, 92, 70, 85, 96, 91].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/60 to-primary"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Activity feed mockup */}
                <div className="space-y-2">
                  {[
                    { name: "田中", action: "日報を提出", time: "2分前", badge: "bg-primary" },
                    { name: "佐藤", action: "ピアボーナスを送信", time: "5分前", badge: "bg-accent-color" },
                    { name: "鈴木", action: "Lv3に到達!", time: "12分前", badge: "bg-success" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <div className={`w-7 h-7 rounded-full ${item.badge} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {item.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate">
                          <span className="font-medium">{item.name}</span> が{item.action}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/30 shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification card */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl p-4 w-56 border border-border animate-bounce" style={{ animationDuration: "3s" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-accent-color/10 flex items-center justify-center">
                  <span className="text-accent-color text-sm">🔥</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">ストリーク継続!</p>
                  <p className="text-[10px] text-muted-foreground">14日連続提出 +10XP</p>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary rounded-full h-1.5 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
