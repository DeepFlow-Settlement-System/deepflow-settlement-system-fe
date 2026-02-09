import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { findRoomByInviteCode, joinRoomByInviteCode } from "@/storage/rooms";

const ME_KEY = "user_name_v1";
function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

export default function JoinByInviteCodePage() {
  const navigate = useNavigate();
  const me = loadMe();

  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [found, setFound] = useState(null);

  const canQuery = useMemo(() => code.trim().length >= 4, [code]);

  const onQuery = () => {
    setErr("");
    const f = findRoomByInviteCode(code);
    if (!f) {
      setFound(null);
      setErr("유효하지 않은 초대코드입니다.");
      return;
    }
    setFound(f);
  };

  const onJoin = () => {
    try {
      setErr("");
      const res = joinRoomByInviteCode({ inviteCode: code, me });
      navigate(`/rooms/${res.roomId}`, { replace: true });
    } catch (e) {
      setErr(e?.message || "참여 실패");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">초대코드로 그룹 참여</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>초대코드</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예) AB12CD34"
              />
              <div className="text-xs text-muted-foreground">
                * 지금은 로컬 저장 기반이라 같은 브라우저/저장소에서만
                조회됩니다.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={onQuery} disabled={!canQuery}>
                그룹정보 조회
              </Button>
              <Button variant="outline" onClick={() => navigate("/rooms")}>
                방 목록으로
              </Button>
            </div>

            {err && <div className="text-sm text-destructive">{err}</div>}
          </CardContent>
        </Card>

        {found && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">조회 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl border bg-muted overflow-hidden shrink-0">
                  {found.room?.imageUrl ? (
                    <img
                      src={found.room.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                      No Img
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {found.room?.name || "(이름 없음)"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    일정: {found.room?.tripStart ?? "?"} ~{" "}
                    {found.room?.tripEnd ?? "?"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    roomId: {found.roomId} · code: {found.inviteCode}
                  </div>
                </div>
              </div>

              <Button onClick={onJoin} className="w-full">
                참여하기
              </Button>

              <div className="text-xs text-muted-foreground">
                * 참여 후 방 홈으로 이동합니다.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
