// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import KakaoOAuthPage from "@/pages/KakaoOAuthPage";
import RoomsPage from "@/pages/RoomsPage";
import RequireAuth from "@/components/RequireAuth";

// ✅ room pages (너가 올린 코드에 있었던 것들)
import RoomLayout from "@/pages/room/RoomLayout";
import RoomHomePage from "@/pages/room/RoomHomePage";
import RoomInvitePage from "@/pages/room/RoomInvitePage";
import RoomAddExpensePage from "@/pages/room/RoomAddExpensePage";
import RoomSettlementPage from "@/pages/room/RoomSettlementPage";
import RoomSettingsPage from "@/pages/room/RoomSettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/rooms" replace />} />

      <Route path="/login" element={<LoginPage />} />

      {/* ✅ 카카오 redirect_uri가 프론트로 들어오는 라우트 */}
      <Route path="/v1/oauth2/kakao" element={<KakaoOAuthPage />} />

      {/* ✅ 로그인 필요한 영역 */}
      <Route element={<RequireAuth />}>
        <Route path="/rooms" element={<RoomsPage />} />

        {/* ✅ 핵심: /rooms/:roomId 하위 라우트들을 등록해야 함 */}
        <Route path="/rooms/:roomId" element={<RoomLayout />}>
          <Route index element={<RoomHomePage />} />
          <Route path="invite" element={<RoomInvitePage />} />
          <Route path="add-expense" element={<RoomAddExpensePage />} />
          <Route path="settlement" element={<RoomSettlementPage />} />
          <Route path="settings" element={<RoomSettingsPage />} />
        </Route>
      </Route>

      {/* 없는 경로 */}
      <Route path="*" element={<Navigate to="/rooms" replace />} />
    </Routes>
  );
}
