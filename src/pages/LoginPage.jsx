import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const USERS_KEY = "users_v1";
const ME_KEY = "user_name_v1";

function upsertUser(name) {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed : [];
    if (!arr.includes(name)) {
      const next = [...arr, name];
      localStorage.setItem(USERS_KEY, JSON.stringify(next));
    }
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify([name]));
  }
}

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    const me = localStorage.getItem(ME_KEY) || "현서";
    localStorage.setItem(ME_KEY, me);
    upsertUser(me);
    navigate("/rooms", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center font-black">
              TS
            </div>
            <div>
              <CardTitle className="text-xl">Trip Split</CardTitle>
              <p className="text-sm text-muted-foreground">
                여행 지출 기록 & 정산 요청
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground leading-relaxed">
            여행 중 지출을 바로 기록하고, 원하는 시점에 정산 요청을 보낼 수
            있어요.
          </div>

          <div className="rounded-xl border bg-muted/40 p-3 text-sm">
            <div>
              ✔ 로그인은 <b>카카오 계정</b>으로만 진행돼요.
            </div>
            <div>✔ 자동 송금은 제공하지 않아요. (요청 링크 전송 방식)</div>
          </div>

          <Separator />

          <Button
            type="button"
            onClick={handleLogin}
            className="w-full bg-[#FEE500] text-black hover:bg-[#FEE500]/90"
          >
            카카오로 시작하기 (더미)
          </Button>

          <p className="text-xs text-muted-foreground">
            로그인 버튼은 현재 더미입니다. (API 연결 시 실제 카카오 로그인으로
            교체)
            <br />
            (B-1) 로그인 시 앱 유저 목록(users_v1)에 자동 등록됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
