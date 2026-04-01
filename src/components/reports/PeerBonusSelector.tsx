"use client";

import { useState } from "react";
import { Heart, Check, Gift, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PeerBonusSelection {
  toUserId: string;
  message: string;
}

interface PeerBonusSelectorProps {
  members: TeamMember[];
  available: boolean;
  onChange: (selection: PeerBonusSelection | null) => void;
}

export function PeerBonusSelector({
  members,
  available,
  onChange,
}: PeerBonusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const selectedMember = members.find((m) => m.id === selectedUserId);

  if (!available) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Gift className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              本日のピアボーナスは送信済みです
            </p>
            <p className="text-xs text-muted-foreground">
              明日またメンバーに感謝を伝えましょう
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (members.length === 0) return null;

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsOpen(false);
    if (message) {
      onChange({ toUserId: userId, message });
    }
  };

  const handleMessageChange = (msg: string) => {
    setMessage(msg);
    if (selectedUserId && msg) {
      onChange({ toUserId: selectedUserId, message: msg });
    } else {
      onChange(null);
    }
  };

  const handleSkip = () => {
    setSelectedUserId(null);
    setMessage("");
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-accent-color/20 bg-gradient-to-r from-accent-color/3 to-transparent p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-color/10">
          <Heart className="h-4 w-4 text-accent-color" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            今日の感謝を伝える
          </p>
          <p className="text-xs text-muted-foreground">
            1日1回、チームメンバーにピアボーナスを贈れます（任意）
          </p>
        </div>
      </div>

      {/* Member selection */}
      <div className="space-y-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm motion-safe:transition-colors hover:border-accent-color/30"
          >
            {selectedMember ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedMember.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {selectedMember.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {selectedMember.name}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">
                感謝を伝えたい相手を選ぶ...
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground motion-safe:transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm motion-safe:transition-colors hover:bg-muted ${
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

        {/* Message input */}
        {selectedUserId && (
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="感謝のメッセージを書く（例: 今日のMTGでの提案、とても助かりました！）"
              rows={2}
              className="border-border text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground motion-safe:transition-colors"
              >
                スキップ
              </button>
              {selectedUserId && message && (
                <span className="flex items-center gap-1 text-xs text-accent-color">
                  <Gift className="h-3 w-3" />
                  1P送信されます
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
