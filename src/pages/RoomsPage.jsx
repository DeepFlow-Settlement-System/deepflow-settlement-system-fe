import { useMemo, useState } from "react";
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

const STORAGE_KEY = "rooms_v2";

function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function RoomsPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(() => loadRooms());
  const [open, setOpen] = useState(false);

  const [roomName, setRoomName] = useState("");
  const today = toDateKey(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const canCreate = useMemo(() => {
    return (
      roomName.trim().length >= 1 &&
      startDate &&
      endDate &&
      startDate <= endDate
    );
  }, [roomName, startDate, endDate]);

  const resetForm = () => {
    setRoomName("");
    setStartDate(today);
    setEndDate(today);
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };

  const goRoom = (roomId) => {
    navigate(`/rooms/${roomId}/invite`);
  };

  const handleCreateRoom = () => {
    if (!canCreate) return;

    const newRoom = {
      id: String(Date.now()),
      name: roomName.trim(),
      tripStart: startDate,
      tripEnd: endDate,
      createdAt: new Date().toISOString(),
    };

    const nextRooms = [newRoom, ...rooms];
    setRooms(nextRooms);
    saveRooms(nextRooms);

    setOpen(false);
    navigate(`/rooms/${newRoom.id}/invite`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
            <p className="text-sm text-muted-foreground">
              여행 방을 만들고 멤버를 초대해 정산을 시작해요.
            </p>
          </div>

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
                  <Label htmlFor="roomName">방 이름</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="예) 제주도 여행"
                    autoFocus
                  />
                </div>

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
                <Button variant="outline" onClick={() => setOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateRoom} disabled={!canCreate}>
                  생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 리스트 */}
        <div className="mt-6 grid gap-3">
          {rooms.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  아직 방이 없습니다. <b>+ 방 만들기</b>로 생성해보세요.
                </div>
              </CardContent>
            </Card>
          ) : (
            rooms.map((r) => (
              <Card
                key={r.id}
                className="cursor-pointer transition hover:shadow-sm"
                onClick={() => goRoom(r.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{r.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    일정: {r.tripStart ?? "?"} ~ {r.tripEnd ?? "?"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    id: {r.id}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          (더미) 방 정보는 localStorage에 저장됩니다.
        </p>
      </div>
    </div>
  );
}
