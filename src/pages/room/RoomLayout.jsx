// src/pages/room/RoomLayout.jsx
import { NavLink, Outlet, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";

const ROOMS_KEY = "rooms_v2";

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

export default function RoomLayout() {
  const { roomId } = useParams();
  const base = `/rooms/${roomId}`;

  const room = useMemo(() => {
    const rooms = loadRooms();
    return rooms.find((r) => String(r.id) === String(roomId)) || null;
  }, [roomId]);

  const imageUrl = room?.imageUrl || "";
  const roomName = room?.name || "";

  const linkCls = ({ isActive }) =>
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* ✅ 그룹 이미지 */}
              <div className="h-12 w-12 rounded-xl border bg-muted overflow-hidden shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
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
                <div className="text-xs text-muted-foreground">Room</div>

                {/* 방 이름이 있으면 보여주고, 없으면 roomId */}
                <h1 className="text-xl font-bold tracking-tight truncate">
                  {roomName ? roomName : `#${roomId}`}
                </h1>

                {roomName && (
                  <div className="text-xs text-muted-foreground truncate">
                    id: {roomId}
                  </div>
                )}
              </div>
            </div>

            <Button asChild variant="outline">
              <NavLink to="/rooms">방 목록</NavLink>
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="ghost"
              className={linkCls({ isActive: false })}
            >
              <NavLink to={base} end className={linkCls}>
                홈
              </NavLink>
            </Button>

            <Button asChild variant="ghost">
              <NavLink to={`${base}/invite`} className={linkCls}>
                초대
              </NavLink>
            </Button>

            <Button asChild variant="ghost">
              <NavLink to={`${base}/add-expense`} className={linkCls}>
                등록
              </NavLink>
            </Button>

            <Button asChild variant="ghost">
              <NavLink to={`${base}/settlement`} className={linkCls}>
                정산
              </NavLink>
            </Button>

            <Button asChild variant="ghost">
              <NavLink to={`${base}/settings`} className={linkCls}>
                설정
              </NavLink>
            </Button>
          </div>
        </Card>

        <div className="mt-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
