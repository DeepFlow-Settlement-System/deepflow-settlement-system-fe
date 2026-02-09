import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupDetail, getInviteCode } from "@/api/groups";

export default function RoomInvitePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [inviteCodeData, setInviteCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [groupData, inviteData] = await Promise.all([
          getGroupDetail(Number(roomId)),
          getInviteCode(Number(roomId)),
        ]);
        setGroup(groupData);
        setInviteCodeData(inviteData);
      } catch (e) {
        console.error("데이터 조회 실패:", e);
        setError(e?.message || "데이터를 불러오는데 실패했습니다.");
        setGroup(null);
        setInviteCodeData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  const inviteCode = useMemo(() => {
    return inviteCodeData?.code
      ? String(inviteCodeData.code).toUpperCase()
      : "";
  }, [inviteCodeData]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">친구 초대</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                데이터를 불러오는 중...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">친구 초대</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {error || "방 정보를 찾을 수 없어요."}
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
