// src/components/RequireAuth.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const location = useLocation();

  // ✅ 개발환경(로컬)에서는 로그인 없이도 화면 확인 가능
  if (import.meta.env.DEV) return <Outlet />;

  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
