"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Award,
  Star,
  Flame,
  ChevronDown,
  Sparkles,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RankingEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  score: number;
}

interface MvpEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  achievement: string;
}

interface BadgeEarner {
  userId: string;
  name: string;
  avatarUrl?: string;
  badgeName: string;
  badgeIcon: string;
}

interface CheckinRecommendation {
  userId: string;
  name: string;
  avatarUrl?: string;
  content: string;
}

interface DigestData {
  id: string;
  tenant_id: string;
  week_start: string;
  week_end: string;
  data: {
    rankings?: {
      performance?: RankingEntry[];
      activity?: RankingEntry[];
      stepScore?: RankingEntry[];
    };
    mvp?: {
      numeric?: MvpEntry;
      process?: MvpEntry;
    };
    badgeEarners?: BadgeEarner[];
    recommendations?: CheckinRecommendation[];
  };
  created_at: string;
}

interface DigestPageClientProps {
  digests: DigestData[];
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
const rankIcons = [Trophy, Medal, Award];

function RankingTable({
  title,
  entries,
  unit,
}: {
  title: string;
  entries: RankingEntry[];
  unit?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[#0C025F]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="text-sm text-[#64748B]">データがありません</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry, idx) => {
              const RankIcon = rankIcons[idx] ?? null;
              return (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#F0F4FF] transition-colors"
                >
                  <span
                    className={`w-6 text-center text-sm font-bold font-mono ${
                      idx < 3 ? rankColors[idx] : "text-[#64748B]"
                    }`}
                  >
                    {idx < 3 && RankIcon ? (
                      <RankIcon className="h-4 w-4 mx-auto" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={entry.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {entry.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium text-[#1E293B] truncate">
                    {entry.name}
                  </span>
                  <span className="text-sm font-mono font-semibold text-[#0C025F]">
                    {entry.score.toLocaleString()}
                    {unit && (
                      <span className="text-xs text-[#64748B] ml-0.5">
                        {unit}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MvpCard({
  label,
  mvp,
  icon: Icon,
  accentColor,
}: {
  label: string;
  mvp: MvpEntry | undefined;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}) {
  if (!mvp) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-[#64748B]">
          {label}: データがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${accentColor}`} />
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-5 w-5 text-[#0C025F]" />
          <h3 className="text-sm font-semibold text-[#0C025F]">{label}</h3>
        </div>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={mvp.avatarUrl} />
            <AvatarFallback className="text-lg font-medium">
              {mvp.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-[#1E293B]">
              {mvp.name}
            </p>
            <p className="text-sm text-[#64748B] mt-0.5">{mvp.achievement}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DigestPageClient({ digests }: DigestPageClientProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (digests.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#0C025F]">週刊STEP</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-[#64748B] mb-4" />
            <p className="text-[#64748B]">
              まだ週刊STEPが生成されていません。
            </p>
            <p className="text-sm text-[#64748B] mt-1">
              週次の集計後に自動的に生成されます。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = digests[selectedIdx];
  const digestData = current.data ?? {};
  const rankings = digestData.rankings ?? {};
  const mvp = digestData.mvp ?? {};
  const badgeEarners = digestData.badgeEarners ?? [];
  const recommendations = digestData.recommendations ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#0C025F]">週刊STEP</h1>

        {/* Week selector */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="min-w-[180px] justify-between"
          >
            <span>{formatWeekLabel(current.week_start)}</span>
            <ChevronDown className="h-4 w-4 ml-2 text-[#64748B]" />
          </Button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-[200px] rounded-lg border border-slate-200 bg-white shadow-sm">
              {digests.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedIdx(i);
                    setDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#F0F4FF] transition-colors ${
                    i === selectedIdx
                      ? "bg-[#F0F4FF] font-medium text-[#0C025F]"
                      : "text-[#1E293B]"
                  } ${i === 0 ? "rounded-t-lg" : ""} ${
                    i === digests.length - 1 ? "rounded-b-lg" : ""
                  }`}
                >
                  {formatWeekLabel(d.week_start)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rankings */}
      <section>
        <h2 className="text-lg font-semibold text-[#0C025F] mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          ランキング
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RankingTable
            title="パフォーマンス"
            entries={rankings.performance ?? []}
          />
          <RankingTable
            title="アクティビティ"
            entries={rankings.activity ?? []}
            unit="pt"
          />
          <RankingTable
            title="STEPスコア"
            entries={rankings.stepScore ?? []}
            unit="pt"
          />
        </div>
      </section>

      {/* MVP */}
      <section>
        <h2 className="text-lg font-semibold text-[#0C025F] mb-3 flex items-center gap-2">
          <Star className="h-5 w-5" />
          MVP紹介
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MvpCard
            label="数字MVP"
            mvp={mvp.numeric}
            icon={Flame}
            accentColor="bg-[#D97706]"
          />
          <MvpCard
            label="プロセスMVP"
            mvp={mvp.process}
            icon={Sparkles}
            accentColor="bg-[#2563EB]"
          />
        </div>
      </section>

      {/* Badge earners */}
      <section>
        <h2 className="text-lg font-semibold text-[#0C025F] mb-3 flex items-center gap-2">
          <Award className="h-5 w-5" />
          バッジ獲得者
        </h2>
        {badgeEarners.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-[#64748B]">
              今週のバッジ獲得者はいません
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {badgeEarners.map((earner, i) => (
                  <div
                    key={`${earner.userId}-${i}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F0F4FF] transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={earner.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {earner.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-[#1E293B]">
                      {earner.name}
                    </span>
                    <span className="text-base" title={earner.badgeName}>
                      {earner.badgeIcon}
                    </span>
                    <span className="text-sm text-[#64748B]">
                      {earner.badgeName}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-lg font-semibold text-[#0C025F] mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          おすすめピックアップ
        </h2>
        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-[#64748B]">
              今週のピックアップはありません
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, i) => (
              <Card key={`${rec.userId}-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={rec.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {rec.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-[#1E293B]">
                      {rec.name}
                    </span>
                  </div>
                  <p className="text-sm text-[#1E293B] leading-relaxed">
                    {rec.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
