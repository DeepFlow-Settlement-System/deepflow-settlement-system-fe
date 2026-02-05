import { NavLink, Outlet, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RoomLayout() {
  const { roomId } = useParams();
  const base = `/rooms/${roomId}`;

  const linkCls = ({ isActive }) =>
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Room</div>
              <h1 className="text-xl font-bold tracking-tight">#{roomId}</h1>
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
