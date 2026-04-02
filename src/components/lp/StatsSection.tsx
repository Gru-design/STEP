export function StatsSection() {
  return (
    <section className="py-20 bg-muted/40 border-y border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
          {[
            { value: "90%", label: "日報作成時間を削減" },
            { value: "95%+", label: "提出率を実現" },
            { value: "1/12", label: "マネージャー確認時間" },
            { value: "30 min", label: "で運用開始可能" },
          ].map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="font-serif text-[32px] md:text-[40px] font-semibold text-foreground leading-none tracking-tight">
                {stat.value}
              </p>
              <p className="text-[13px] text-muted-foreground mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
