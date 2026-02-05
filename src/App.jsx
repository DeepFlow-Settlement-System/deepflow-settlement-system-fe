import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RoomsPage from "./pages/RoomsPage";

import RoomLayout from "./pages/room/RoomLayout";
import RoomHomePage from "./pages/room/RoomHomePage";
import RoomAddExpensePage from "./pages/room/RoomAddExpensePage";
import RoomSettlementPage from "./pages/room/RoomSettlementPage";
import RoomSettingsPage from "./pages/room/RoomSettingsPage";
import RoomInvitePage from "./pages/room/RoomInvitePage";

function RequireAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

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

      <Route path="*" element={<div style={{ padding: 16 }}>404</div>} />
    </Routes>
  );
}
