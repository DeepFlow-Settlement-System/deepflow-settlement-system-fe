// src/pages/RoomsPage.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getGroups, createGroup, uploadGroupImage, getGroupImage } from "@/api/groups";

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
 * 정사각형 센터 크롭 + 리사이즈 + JPEG 압축
 * - size: 최종 정사각형 한 변 px
 * - quality: 0~1 (jpeg)
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

export default function RoomsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState("");
  const today = toDateKey(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const canCreate = useMemo(() => {
    return (
      groupName.trim().length >= 1 &&
      startDate &&
      endDate &&
      startDate <= endDate
    );
  }, [groupName, startDate, endDate]);

  // 그룹 목록 조회
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getGroups();
        const groupsList = Array.isArray(data) ? data : [];
        
        // 각 그룹의 이미지 조회
        const groupsWithImages = await Promise.all(
          groupsList.map(async (g) => {
            let imageUrl = null;
            try {
              imageUrl = await getGroupImage(g.id);
            } catch (e) {
              // 이미지가 없거나 조회 실패 시 null
              imageUrl = null;
            }
            return {
              ...g,
              imageUrl: imageUrl || g.imageUrl || null,
              tripStart: g.startDate || null,
              tripEnd: g.endDate || null,
            };
          })
        );
        
        setGroups(groupsWithImages);
      } catch (e) {
        console.error("그룹 목록 조회 실패:", e);
        setError(e?.message || "그룹 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setGroupImageUrl("");
    setStartDate(today);
    setEndDate(today);
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const goGroup = (groupId) => {
    navigate(`/rooms/${groupId}/invite`);
  };

  const handleCreateGroup = async () => {
    if (!canCreate) return;

    try {
      setError("");

      // 날짜 형식 검증 및 정규화
      const normalizeDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        // YYYY-MM-DD 형식인지 확인
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateStr.trim())) {
          return dateStr.trim();
        }
        return null;
      };

      const groupData = {
        name: groupName.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(normalizeDate(startDate) && { startDate: normalizeDate(startDate) }),
        ...(normalizeDate(endDate) && { endDate: normalizeDate(endDate) }),
      };

      // 디버깅: 실제 전송되는 데이터 확인
      console.log("전송할 데이터:", JSON.stringify(groupData, null, 2));
      console.log("startDate 타입:", typeof startDate, "값:", startDate);
      console.log("endDate 타입:", typeof endDate, "값:", endDate);

      const newGroup = await createGroup(groupData);

      // 그룹 이미지 업로드
      if (groupImageUrl) {
        try {
          // base64 data URL을 Blob으로 변환
          const response = await fetch(groupImageUrl);
          const blob = await response.blob();
          await uploadGroupImage(newGroup.id, blob);
        } catch (e) {
          console.error("이미지 업로드 실패:", e);
          // 이미지 업로드 실패해도 그룹 생성은 성공했으므로 계속 진행
        }
      }

      // 새로 생성된 그룹의 이미지 조회
      let imageUrl = null;
      try {
        imageUrl = await getGroupImage(newGroup.id);
      } catch (e) {
        // 이미지가 없으면 null
        imageUrl = null;
      }

      // 새로 생성된 그룹을 목록에 추가
      setGroups((prev) => [
        {
          ...newGroup,
          imageUrl: imageUrl || newGroup.imageUrl || null,
          tripStart: newGroup.startDate || startDate,
          tripEnd: newGroup.endDate || endDate,
        },
        ...prev,
      ]);

      setOpen(false);
      resetForm();
      navigate(`/rooms/${newGroup.id}/invite`);
    } catch (e) {
      console.error("그룹 생성 실패:", e);
      setError(e?.message || "그룹 생성에 실패했습니다.");
    }
  };

  const handlePickImage = async (file) => {
    if (!file) return;

    // 3MB 제한
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("이미지 파일은 최대 3MB까지 업로드할 수 있어요.");
      return;
    }

    if (!file.type?.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      const squareJpeg = await cropSquareToJpegDataURL(file, 480, 0.82);
      setGroupImageUrl(squareJpeg);
    } catch {
      alert("이미지 처리에 실패했어요. 다른 이미지를 선택해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 디버그 표시(원하면 삭제 가능) */}
        <div className="text-red-500 font-bold">ROOMS UPDATED!</div>

        <div className="flex items-center justify-between gap-3 mt-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
            <p className="text-sm text-muted-foreground">
              여행 방을 만들고 멤버를 초대해 정산을 시작해요.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/join")}>
              초대코드로 참여
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openModal}>+ 방 만들기</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                  <DialogTitle>방 만들기</DialogTitle>
                </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="groupName">그룹 이름</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="예) 제주도 여행"
                    autoFocus
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="그룹에 대한 설명을 입력하세요"
                  />
                </div>

                {/* 그룹 이미지 */}
                <div className="grid gap-2">
                  <Label>그룹 이미지 (정사각형)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePickImage(e.target.files?.[0])}
                  />

                  {groupImageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={groupImageUrl}
                        alt="group preview"
                        className="h-20 w-20 rounded-xl border object-cover"
                      />
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">
                          * 자동으로 정사각형으로 잘라 저장돼요.
                          <br />* 3MB 이하만 가능
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setGroupImageUrl("")}
                        >
                          이미지 제거
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      * 선택하면 자동으로 정사각형으로 저장돼요 (최대 3MB).
                    </div>
                  )}
                </div>

                {/* 여행 일정 */}
                <div className="grid gap-2">
                  <Label>여행 일정</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        시작
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        종료
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {startDate > endDate && (
                    <p className="text-sm font-medium text-destructive">
                      시작일이 종료일보다 늦을 수 없어요.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleCreateGroup} disabled={!canCreate}>
                  생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Card className="mt-6 border-destructive">
            <CardContent className="p-4">
              <div className="text-sm text-destructive">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* 리스트 */}
        <div className="mt-6 grid gap-3">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  그룹 목록을 불러오는 중...
                </div>
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  아직 그룹이 없습니다. <b>+ 방 만들기</b>로 생성해보세요.
                </div>
              </CardContent>
            </Card>
          ) : (
            groups.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer transition hover:shadow-sm"
                onClick={() => goGroup(g.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border bg-muted overflow-hidden">
                      {g.imageUrl ? (
                        <img
                          src={g.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                          No Img
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-base">{g.name}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {g.description && (
                    <div className="text-sm text-muted-foreground">
                      {g.description}
                    </div>
                  )}
                  {g.tripStart && g.tripEnd && (
                    <div className="text-sm text-muted-foreground mt-1">
                      일정: {g.tripStart} ~ {g.tripEnd}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    ID: {g.id}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
