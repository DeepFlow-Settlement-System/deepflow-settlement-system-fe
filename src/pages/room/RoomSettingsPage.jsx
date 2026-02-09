import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ensureInviteCodeForRoom,
  findRoomById,
  leaveRoom,
  loadMembers,
  saveMembers,
  loadRooms,
  saveRooms,
} from "@/storage/rooms";

const ME_KEY = "user_name_v1";

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}
function saveMe(name) {
  localStorage.setItem(ME_KEY, name);
}

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

  const [room, setRoom] = useState(null);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const toast = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1500);
  };

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
      toast("초대코드 복사됨");
    } catch {
      window.prompt(
        "복사에 실패했어요. 아래 코드를 직접 복사해 주세요.",
        inviteCode,
      );
    }
  };

  const [me, setMe] = useState(() => loadMe());
  const updateMe = () => {
    const next = me.trim() || "현서";
    const old = loadMe();
    saveMe(next);
    setMe(next);

    const members = loadMembers(roomId);
    const replaced = members.map((m) => (m === old ? next : m));
    saveMembers(roomId, Array.from(new Set(replaced)));
    toast("내 이름 저장됨");
  };

  const [members, setMembers] = useState(() => {
    const m = loadMembers(roomId);
    const who = loadMe();
    const base = m.length === 0 ? [who] : m;
    return base.includes(who) ? base : [who, ...base];
  });

  useEffect(() => {
    const m = loadMembers(roomId);
    const who = loadMe();
    const base = m.length === 0 ? [who] : m;
    setMembers(base.includes(who) ? base : [who, ...base]);
  }, [roomId]);

  const persistMembers = (next) => {
    const unique = Array.from(new Set(next));
    setMembers(unique);
    saveMembers(roomId, unique);
  };

  const [newMember, setNewMember] = useState("");
  const canAdd = useMemo(() => newMember.trim().length >= 1, [newMember]);

  const addMember = () => {
    if (!canAdd) return;
    const name = newMember.trim();
    if (members.includes(name)) return;
    persistMembers([...members, name]);
    setNewMember("");
    toast(`멤버 "${name}" 추가`);
  };

  const removeMember = (name) => {
    const next = members.filter((m) => m !== name);
    if (next.length === 0) return;
    persistMembers(next);
    toast(`멤버 "${name}" 삭제`);
  };

  const [roomImageUrl, setRoomImageUrl] = useState(() => room?.imageUrl || "");
  useEffect(() => {
    setRoomImageUrl(room?.imageUrl || "");
  }, [room?.imageUrl]);

  const persistRoomImage = (nextUrl) => {
    const rooms = loadRooms();
    const nextRooms = rooms.map((r) =>
      String(r.id) === String(roomId) ? { ...r, imageUrl: nextUrl } : r,
    );
    saveRooms(nextRooms);
    setRoomImageUrl(nextUrl);
    toast(nextUrl ? "그룹 이미지 저장됨" : "그룹 이미지 삭제됨");
  };

  const handlePickRoomImage = async (file) => {
    if (!file) return;

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) return toast("이미지 파일은 최대 3MB까지 가능");
    if (!file.type?.startsWith("image/")) return toast("이미지 파일만 가능");

    try {
      const squareJpeg = await cropSquareToJpegDataURL(file, 480, 0.82);
      persistRoomImage(squareJpeg);
    } catch {
      toast("이미지 처리 실패. 다른 파일을 선택해 주세요.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  const handleLeaveRoom = () => {
    const who = loadMe();
    const ok = window.confirm(
      "정말 이 방에서 나갈까요? (내 방 목록에서 제거됩니다)",
    );
    if (!ok) return;

    leaveRoom({ roomId, me: who });
    toast("방에서 나왔어요");
    navigate("/rooms", { replace: true });
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">설정</CardTitle>
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
            <CardTitle className="text-base">내 이름 (더미)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>표시 이름</Label>
              <div className="flex gap-2">
                <Input value={me} onChange={(e) => setMe(e.target.value)} />
                <Button onClick={updateMe}>저장</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">멤버 (더미)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>멤버 추가</Label>
              <div className="flex gap-2">
                <Input
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="추가할 멤버 이름"
                />
                <Button onClick={addMember} disabled={!canAdd}>
                  추가
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>멤버 목록</Label>
              <div className="grid gap-2">
                {members.map((m) => (
                  <div
                    key={m}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {m} {m === loadMe() ? "(나)" : ""}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(m)}
                      disabled={members.length <= 1}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
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
