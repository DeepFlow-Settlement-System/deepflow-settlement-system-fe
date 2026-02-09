import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getJoinInfo, joinGroup } from "@/api/groups";

const GROUP_IMAGES_KEY = "group_images_v1";
const GROUP_SCHEDULES_KEY = "group_schedules_v1";

function loadGroupImage(groupId) {
  try {
    const raw = localStorage.getItem(GROUP_IMAGES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[groupId] || null;
  } catch {
    return null;
  }
}

function loadGroupSchedule(groupId) {
  try {
    const raw = localStorage.getItem(GROUP_SCHEDULES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[groupId] || null;
  } catch {
    return null;
  }
}

export default function JoinByInviteCodePage() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [found, setFound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const canQuery = useMemo(() => code.trim().length >= 4, [code]);

  const onQuery = async () => {
    setErr("");
    setFound(null);
    setLoading(true);
    try {
      const data = await getJoinInfo(code.toUpperCase());
      setFound({
        group: data,
        groupId: data.id,
        inviteCode: code.toUpperCase(),
      });
    } catch (e) {
      console.error("그룹 정보 조회 실패:", e);
      setErr(e?.message || "유효하지 않은 초대코드입니다.");
      setFound(null);
    } finally {
      setLoading(false);
    }
  };

  const onJoin = async () => {
    if (!found) return;
    try {
      setErr("");
      setJoining(true);
      await joinGroup(code.toUpperCase());
      navigate(`/rooms/${found.groupId}`, { replace: true });
    } catch (e) {
      console.error("그룹 참여 실패:", e);
      setErr(e?.message || "참여 실패");
    } finally {
      setJoining(false);
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
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={onQuery} disabled={!canQuery || loading}>
                {loading ? "조회 중..." : "그룹정보 조회"}
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
                  {loadGroupImage(found.groupId) ? (
                    <img
                      src={loadGroupImage(found.groupId)}
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
                    {found.group?.name || "(이름 없음)"}
                  </div>
                  {found.group?.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {found.group.description}
                    </div>
                  )}
                  {(() => {
                    const schedule = loadGroupSchedule(found.groupId);
                    if (schedule?.tripStart && schedule?.tripEnd) {
                      return (
                        <div className="text-xs text-muted-foreground mt-1">
                          일정: {schedule.tripStart} ~ {schedule.tripEnd}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="text-xs text-muted-foreground mt-1">
                    그룹 ID: {found.groupId} · 코드: {found.inviteCode}
                  </div>
                </div>
              </div>

              <Button onClick={onJoin} className="w-full" disabled={joining}>
                {joining ? "참여 중..." : "참여하기"}
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
