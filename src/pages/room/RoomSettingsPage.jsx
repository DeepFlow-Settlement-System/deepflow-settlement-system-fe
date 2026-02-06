// src/pages/room/RoomSettingsPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

// ✅ "UID"에 한정하지 않고, 링크/코드 문자열 자체를 저장
const KAKAO_TRANSFER_VALUE_KEY = "kakao_transfer_value_v1";

// ✅ rooms 저장 키 (그룹 이미지 저장)
const ROOMS_KEY = "rooms_v2";

function loadMembers(roomId) {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMembers(roomId, members) {
  localStorage.setItem(MEMBERS_KEY(roomId), JSON.stringify(members));
}

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

function saveMe(name) {
  localStorage.setItem(ME_KEY, name);
}

function loadTransferValue() {
  return localStorage.getItem(KAKAO_TRANSFER_VALUE_KEY) || "";
}

function saveTransferValue(v) {
  localStorage.setItem(KAKAO_TRANSFER_VALUE_KEY, v);
}

function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * ✅ 정사각형 센터 크롭 + 리사이즈 + JPEG 압축
 */
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
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [me, setMe] = useState(() => loadMe());

  const [members, setMembers] = useState(() => {
    const m = loadMembers(roomId);
    if (m.length === 0) return [loadMe()];
    if (!m.includes(loadMe())) return [loadMe(), ...m];
    return m;
  });

  const [newMember, setNewMember] = useState("");
  const canAdd = useMemo(() => newMember.trim().length >= 1, [newMember]);

  const [transferValue, setTransferValue] = useState(() => loadTransferValue());
  const [notice, setNotice] = useState("");

  // ✅ 현재 room 이미지
  const [roomImageUrl, setRoomImageUrl] = useState(() => {
    const rooms = loadRooms();
    const room = rooms.find((r) => String(r.id) === String(roomId)) || null;
    return room?.imageUrl || "";
  });

  const toast = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const persistMembers = (next) => {
    const unique = Array.from(new Set(next));
    setMembers(unique);
    saveMembers(roomId, unique);
  };

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

  const updateMe = () => {
    const old = loadMe();
    const next = me.trim() || "현서";
    setMe(next);
    saveMe(next);

    const replaced = members.map((m) => (m === old ? next : m));
    persistMembers(Array.from(new Set(replaced)));
    toast("내 이름 저장됨");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast("초대 링크 복사됨");
    } catch {
      window.prompt("아래 링크를 복사해서 공유하세요:", inviteLink);
    }
  };

  const handleSaveTransferValue = () => {
    const next = transferValue.trim();

    // ✅ 최소 검증
    if (next && next.length < 6) {
      toast("값이 너무 짧아요. 송금 링크/코드를 다시 확인해 주세요.");
      return;
    }
    if (/\s/.test(next)) {
      toast("공백이 포함되어 있어요. 공백을 제거해 주세요.");
      return;
    }

    saveTransferValue(next);
    toast(next ? "송금 링크/코드 저장됨" : "송금 링크/코드 삭제됨");
  };

  const handleCopyTransferValue = async () => {
    const v = loadTransferValue();
    if (!v) {
      toast("저장된 송금 링크/코드가 없습니다");
      return;
    }
    try {
      await navigator.clipboard.writeText(v);
      toast("송금 링크/코드 복사됨");
    } catch {
      window.prompt("아래 값을 복사하세요:", v);
    }
  };

  // ✅ rooms_v2에 그룹 이미지 저장
  const persistRoomImage = (nextUrl) => {
    const rooms = loadRooms();
    const nextRooms = rooms.map((r) =>
      String(r.id) === String(roomId) ? { ...r, imageUrl: nextUrl } : r,
    );
    saveRooms(nextRooms);
    setRoomImageUrl(nextUrl);
  };

  const handlePickRoomImage = async (file) => {
    if (!file) return;

    // ✅ 3MB 제한
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast("이미지 파일은 최대 3MB까지 업로드할 수 있어요.");
      return;
    }
    if (!file.type?.startsWith("image/")) {
      toast("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      const squareJpeg = await cropSquareToJpegDataURL(file, 480, 0.82);
      persistRoomImage(squareJpeg);
      toast("그룹 이미지 저장됨");
    } catch {
      toast("이미지 처리에 실패했어요. 다른 이미지를 선택해 주세요.");
    }
  };

  const handleRemoveRoomImage = () => {
    persistRoomImage("");
    toast("그룹 이미지 삭제됨");
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      {/* ✅ 그룹 이미지 설정 */}
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
                * 정사각형으로 자동 크롭됩니다
                <br />* 3MB 이하만 가능
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button asChild variant="outline">
                  <label className="cursor-pointer">
                    이미지 변경
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePickRoomImage(e.target.files?.[0])}
                    />
                  </label>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRemoveRoomImage}
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
            <p className="text-xs text-muted-foreground">
              정산 계산에서 “내가 받을/보낼 금액” 기준 이름으로 사용합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ✅ 송금 링크/코드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">카카오 송금 링크/코드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            정산 요청 메시지에 포함될 “송금 링크/코드”를 저장합니다. (UID만이
            아니라 링크/코드 문자열 그대로 저장)
          </p>

          <div className="grid gap-2">
            <Label>송금 링크 또는 코드</Label>
            <div className="flex gap-2">
              <Input
                value={transferValue}
                onChange={(e) => setTransferValue(e.target.value)}
                placeholder="카카오톡에서 복사한 송금 링크/코드를 붙여넣기"
              />
              <Button variant="outline" onClick={handleCopyTransferValue}>
                복사
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveTransferValue}>저장</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setTransferValue("");
                  saveTransferValue("");
                  toast("송금 링크/코드 삭제됨");
                }}
              >
                삭제
              </Button>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">
                현재 저장된 값
              </div>
              <div className="mt-1 font-mono text-sm break-all">
                {loadTransferValue() || "(없음)"}
              </div>
            </div>

            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                어디서 복사해서 넣나요?
              </summary>
              <div className="mt-2 space-y-2 text-muted-foreground text-sm">
                <p>
                  카카오톡에서 송금(카카오페이) 화면에서 “송금 링크/코드”를
                  생성한 뒤 복사한 값을 여기에 붙여넣어 저장하세요.
                </p>
                <p className="text-xs">
                  팀에서 “UID가 노출된다”는 요구가 있어도, 형식이 바뀔 수 있으니
                  링크/코드 전체를 저장하는 방식이 더 안전합니다.
                </p>
              </div>
            </details>
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
            <p className="text-xs text-muted-foreground">
              참여자 체크/정산 계산에 사용됩니다.
            </p>
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
          <CardTitle className="text-base">친구 초대</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={handleCopyInviteLink}>
            초대 링크 복사 (더미)
          </Button>
          <p className="text-xs text-muted-foreground">
            나중에 카카오 공유 SDK 붙이면 “카카오로 공유”로 확장 가능.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">계정</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            로그아웃(더미)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
