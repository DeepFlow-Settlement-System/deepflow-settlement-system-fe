// src/App.jsx
import React from "react";
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

import RequireAuth from "@/components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      {/* ✅ 카카오 Redirect URI를 /auth/callback 으로 맞추기 */}
      <Route path="/auth/callback" element={<KakaoOAuthPage />} />
      <Route path="/v1/oauth2/kakao" element={<KakaoOAuthPage />} /> // 추가
      <Route element={<RequireAuth />}>
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:roomId" element={<RoomLayout />}>
          <Route index element={<RoomHomePage />} />
          <Route path="invite" element={<RoomInvitePage />} />
          <Route path="add-expense" element={<RoomAddExpensePage />} />
          <Route path="settlement" element={<RoomSettlementPage />} />
          <Route path="settings" element={<RoomSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
