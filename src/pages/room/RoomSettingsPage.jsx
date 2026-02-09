import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getGroupDetail,
  getInviteCode,
  leaveGroup,
  getGroupImage,
  uploadGroupImage,
  deleteGroupImage,
} from "@/api/groups";
import { getMe } from "@/api/users";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function cropSquareToJpegDataURL(file, size = 480, quality = 0.82) {
  const dataUrl = await readFileAsDataURL(file);

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", quality);
}

export default function RoomSettingsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [inviteCodeData, setInviteCodeData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const toast = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1500);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [groupData, inviteData, userData] = await Promise.all([
          getGroupDetail(Number(roomId)),
          getInviteCode(Number(roomId)),
          getMe().catch(() => null), // 실패해도 계속 진행
        ]);
        setGroup(groupData);
        setInviteCodeData(inviteData);
        setCurrentUser(userData);

        // 그룹 이미지 조회
        try {
          const imgUrl = await getGroupImage(Number(roomId));
          setRoomImageUrl(imgUrl || groupData.imageUrl || "");
        } catch (e) {
          setRoomImageUrl(groupData.imageUrl || "");
        }
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
      toast("초대코드 복사됨");
    } catch {
      window.prompt(
        "복사에 실패했어요. 아래 코드를 직접 복사해 주세요.",
        inviteCode,
      );
    }
  };

  const [roomImageUrl, setRoomImageUrl] = useState("");

  const persistRoomImage = async (nextUrl) => {
    try {
      if (nextUrl) {
        // base64 data URL을 Blob으로 변환하여 업로드
        const response = await fetch(nextUrl);
        const blob = await response.blob();
        await uploadGroupImage(Number(roomId), blob);
        setRoomImageUrl(nextUrl);
        toast("그룹 이미지 저장됨");
      } else {
        // 이미지 삭제
        await deleteGroupImage(Number(roomId));
        setRoomImageUrl("");
        toast("그룹 이미지 삭제됨");
      }
    } catch (e) {
      console.error("이미지 저장/삭제 실패:", e);
      toast(e?.message || "이미지 저장/삭제에 실패했습니다.");
    }
  };

  const handlePickRoomImage = async (file) => {
    if (!file) return;

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) return toast("이미지 파일은 최대 3MB까지 가능");
    if (!file.type?.startsWith("image/")) return toast("이미지 파일만 가능");

    try {
      const squareJpeg = await cropSquareToJpegDataURL(file, 480, 0.82);
      await persistRoomImage(squareJpeg);
    } catch (e) {
      console.error("이미지 처리 실패:", e);
      toast("이미지 처리 실패. 다른 파일을 선택해 주세요.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  const handleLeaveRoom = async () => {
    const ok = window.confirm(
      "정말 이 방에서 나갈까요? (내 방 목록에서 제거됩니다)",
    );
    if (!ok) return;

    try {
      await leaveGroup(Number(roomId));
      toast("방에서 나왔어요");
      navigate("/rooms", { replace: true });
    } catch (e) {
      console.error("방 나가기 실패:", e);
      toast(e?.message || "방 나가기에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">설정</CardTitle>
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
              <CardTitle className="text-base">설정</CardTitle>
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

  const members = group?.members || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
        {notice && (
          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">초대코드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              필요할 때 언제든 초대코드를 복사해 친구를 초대할 수 있어요.
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
              <Button
                variant="outline"
                onClick={() => navigate(`/rooms/${roomId}/invite`)}
              >
                초대 전용 화면으로
              </Button>
              <Button onClick={() => navigate(`/rooms/${roomId}`)}>
                방 홈으로
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              * 친구는 “초대코드로 참여” 페이지에서 코드를 입력해 방에
              참여합니다.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">그룹 이미지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-2xl border bg-muted overflow-hidden">
                {roomImageUrl ? (
                  <img
                    src={roomImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                    No Img
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">
                  * 정사각형 자동 크롭 / 3MB 이하
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button asChild variant="outline">
                    <label className="cursor-pointer">
                      이미지 변경
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handlePickRoomImage(e.target.files?.[0])
                        }
                      />
                    </label>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => persistRoomImage("")}
                    disabled={!roomImageUrl}
                  >
                    이미지 삭제
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">내 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentUser ? (
              <div className="grid gap-2">
                <Label>사용자 ID</Label>
                <div className="text-sm text-muted-foreground">
                  {currentUser.id}
                </div>
                <Label>이름</Label>
                <div className="text-sm font-medium">
                  {currentUser.name || currentUser.username || "이름 없음"}
                </div>
                {currentUser.email && (
                  <>
                    <Label>이메일</Label>
                    <div className="text-sm text-muted-foreground">
                      {currentUser.email}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                사용자 정보를 불러올 수 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">멤버</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>멤버 목록</Label>
              <div className="grid gap-2">
                {members.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    멤버가 없습니다.
                  </div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.userId || m.id || m}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm font-medium">
                        {m.name ||
                          m.username ||
                          `사용자 ${m.userId || m.id || m}`}
                        {currentUser &&
                        (m.userId || m.id) ===
                          (currentUser.id || currentUser.userId)
                          ? " (나)"
                          : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              * 멤버 추가/삭제는 초대 코드를 통해 진행됩니다.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">계정 / 방</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={handleLogout}>
              로그아웃
            </Button>
            <Button variant="outline" onClick={handleLeaveRoom}>
              방 나가기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
