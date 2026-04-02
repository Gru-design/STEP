"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Heart, Gift, Send, ChevronDown, Check, ArrowRight } from "lucide-react";
import { sendPeerBonus } from "@/app/(dashboard)/reports/actions";

interface BonusItem {
  id: string;
  fromName: string;
  fromAvatar: string | null;
  toName: string;
  toAvatar: string | null;
  message: string;
  date: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PeerBonusPageClientProps {
  bonuses: BonusItem[];
  members: TeamMember[];
  available: boolean;
  currentUserId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function PeerBonusPageClient({
  bonuses,
  members,
  available,
  currentUserId: _currentUserId,
}: PeerBonusPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedUserId);

  const handleSend = () => {
    if (!selectedUserId || !message.trim()) return;

    startTransition(async () => {
      const result = await sendPeerBonus({
        toUserId: selectedUserId,
        message: message.trim(),
      });

      if (result.success) {
        toast({ title: "ピアボーナスを送りました！" });
        setSelectedUserId(null);
        setMessage("");
        router.refresh();
      } else {
        toast({
          title: result.error ?? "送信に失敗しました",
          variant: "destructive",
        });
      }
    });
  };

  // Group bonuses by date
  const groupedBonuses: { date: string; items: BonusItem[] }[] = [];
  const dateMap = new Map<string, BonusItem[]>();
  for (const b of bonuses) {
    const group = dateMap.get(b.date) ?? [];
    group.push(b);
    dateMap.set(b.date, group);
  }
  for (const [date, items] of dateMap) {
    groupedBonuses.push({ date, items });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Send form */}
      <Card className="border-2 border-dashed border-accent-color/20 bg-gradient-to-r from-accent-color/3 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-accent-color" />
            {available ? "今日の感謝を伝える" : "本日のピアボーナスは送信済みです"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {available && members.length > 0 ? (
            <div className="space-y-3">
              {/* Member selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm transition-colors hover:border-accent-color/30"
                >
                  {selectedMember ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedMember.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {selectedMember.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{selectedMember.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      感謝を伝えたい相手を選ぶ...
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(member.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted ${
                          member.id === selectedUserId
                            ? "bg-accent-color/5 text-accent-color"
                            : "text-foreground"
                        }`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                        {member.id === selectedUserId && (
                          <Check className="ml-auto h-4 w-4 text-accent-color" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              {selectedUserId && (
                <>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="感謝のメッセージを書く..."
                    rows={3}
                    className="resize-none border-border"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isPending || !message.trim()}
                    className="bg-accent-color hover:bg-accent-color/90 text-white"
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    {isPending ? "送信中..." : "ピアボーナスを送る"}
                  </Button>
                </>
              )}
            </div>
          ) : !available ? (
            <p className="text-sm text-muted-foreground">
              明日またメンバーに感謝を伝えましょう
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              チームメンバーがいません
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bonus history */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-primary">送受信の履歴</h2>

        {groupedBonuses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                まだピアボーナスの履歴がありません
              </p>
            </CardContent>
          </Card>
        ) : (
          groupedBonuses.map((group) => (
            <div key={group.date}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {formatDate(group.date)}
              </p>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const _isReceived = item.toName !== "不明" && bonuses.some(
                    (b) => b.id === item.id
                  );
                  return (
                    <Card key={item.id} className="border-border">
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-color/10">
                          <Heart className="h-4 w-4 text-accent-color" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.fromAvatar ?? undefined} />
                              <AvatarFallback className="text-[8px]">
                                {item.fromName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">
                              {item.fromName}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={item.toAvatar ?? undefined} />
                              <AvatarFallback className="text-[8px]">
                                {item.toName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">
                              {item.toName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
