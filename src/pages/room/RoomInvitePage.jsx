import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ensureInviteCodeForRoom, findRoomById } from "@/storage/rooms";

export default function RoomInvitePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const r = findRoomById(roomId);
    if (!r) {
      setRoom(null);
      return;
    }
    const withCode = ensureInviteCodeForRoom(roomId);
    setRoom(withCode || r);
  }, [roomId]);

  const inviteCode = useMemo(() => {
    return room?.inviteCode ? String(room.inviteCode).toUpperCase() : "";
  }, [room]);

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt(
        "복사에 실패했어요. 아래 코드를 직접 복사해 주세요.",
        inviteCode,
      );
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">친구 초대</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                방 정보를 찾을 수 없어요.
              </div>
              <div className="mt-4">
                <Button onClick={() => navigate("/rooms")}>방 목록으로</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">친구 초대</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              아래 초대코드를 친구에게 보내고, 친구는 <b>“초대코드로 참여”</b>
              에서 입력하면 됩니다.
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 flex items-center justify-between gap-3">
              <div className="font-mono text-lg font-bold tracking-widest">
                {inviteCode || "--------"}
              </div>
              <Button onClick={copyInviteCode} disabled={!inviteCode}>
                {copied ? "복사됨!" : "복사"}
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <Button variant="outline" onClick={() => navigate("/join")}>
                초대코드로 참여 화면 보기
              </Button>
              <Button onClick={() => navigate(`/rooms/${roomId}`)}>
                방 홈으로
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/rooms/${roomId}/settings`)}
              >
                설정으로
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              * 나중에 초대가 더 필요하면 설정에서도 같은 코드를 복사할 수
              있어요.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
