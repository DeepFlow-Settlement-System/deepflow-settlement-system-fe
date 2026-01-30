// src/App.jsx
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RoomsPage from "./pages/RoomsPage";

import RoomLayout from "./pages/room/RoomLayout";
import RoomHomePage from "./pages/room/RoomHomePage";
import RoomExpensesPage from "./pages/room/RoomExpensesPage";
import RoomAddExpensePage from "./pages/room/RoomAddExpensePage";
import RoomSettlementPage from "./pages/room/RoomSettlementPage";
import RoomSettingsPage from "./pages/room/RoomSettingsPage";

function RequireAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/rooms" element={<RoomsPage />} />

          <Route path="/rooms/:roomId" element={<RoomLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<RoomHomePage />} />
            <Route path="expenses" element={<RoomExpensesPage />} />
            <Route path="add-expense" element={<RoomAddExpensePage />} />
            <Route path="settlement" element={<RoomSettlementPage />} />
            <Route path="settings" element={<RoomSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<div style={{ padding: 16 }}>404</div>} />
      </Routes>
    </BrowserRouter>
  );
}
