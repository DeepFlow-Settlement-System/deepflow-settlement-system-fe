// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
