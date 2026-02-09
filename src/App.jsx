import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import KakaoOAuthPage from "@/pages/KakaoOAuthPage";
import RoomsPage from "@/pages/RoomsPage";
import RoomLayout from "@/pages/room/RoomLayout";
import RoomHomePage from "@/pages/room/RoomHomePage";
import RoomInvitePage from "@/pages/room/RoomInvitePage";
import RoomAddExpensePage from "@/pages/room/RoomAddExpensePage";
import RoomSettlementPage from "@/pages/room/RoomSettlementPage";
import RoomSettingsPage from "@/pages/room/RoomSettingsPage";
import JoinByInviteCodePage from "@/pages/JoinByInviteCodePage";

function RequireAuth({ children }) {
  const token = localStorage.getItem("accessToken");

  // ✅ PROD에서는 dev-token 무조건 무효 처리 (배포에서 꼬일 일 방지)
  if (!import.meta.env.DEV && token === "dev-token") {
    localStorage.removeItem("accessToken");
    return <Navigate to="/login" replace />;
  }

  // ✅ DEV(로컬)에서는 로그인 없이도 개발 가능
  if (import.meta.env.DEV) return children;

  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 로그인 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/v1/oauth2/kakao" element={<KakaoOAuthPage />} />

      {/* 초대코드 참여 */}
      <Route path="/join" element={<JoinByInviteCodePage />} />

      {/* 로그인 후 */}
      <Route
        path="/rooms"
        element={
          <RequireAuth>
            <RoomsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/rooms/:roomId"
        element={
          <RequireAuth>
            <RoomLayout />
          </RequireAuth>
        }
      >
        <Route index element={<RoomHomePage />} />
        <Route path="invite" element={<RoomInvitePage />} />
        <Route path="add-expense" element={<RoomAddExpensePage />} />
        <Route path="settlement" element={<RoomSettlementPage />} />
        <Route path="settings" element={<RoomSettingsPage />} />
      </Route>

      <Route path="*" element={<>Hello World</>} />
    </Routes>
  );
}
