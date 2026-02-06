// src/pages/KakaoOAuthPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";

const ME_KEY = "user_name_v1";
const USERS_KEY = "users_v1";

function upsertUser(name) {
  if (!name) return;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed : [];
    if (!arr.includes(name)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([...arr, name]));
    }
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify([name]));
  }
}

export default function KakaoOAuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState("로그인 처리 중...");

  useEffect(() => {
    const run = async () => {
      try {
        const code = params.get("code");
        const err = params.get("error");
        const errDesc = params.get("error_description");

        if (err) throw new Error(errDesc || err || "카카오 로그인 오류");
        if (!code)
          throw new Error(
            "인가 코드(code)가 없습니다. Redirect URI 설정 확인 필요",
          );

        // ✅ 스웨거: GET /api/auth/v1/oauth2/kakao?code=...
        const res = await apiFetch(
          `/api/auth/v1/oauth2/kakao?code=${encodeURIComponent(code)}`,
        );

        // ✅ 스웨거 응답: { status, message, data: { accessToken } }
        const token = res?.data?.accessToken;
        if (!token)
          throw new Error(
            "accessToken을 받지 못했습니다. (data.accessToken 없음)",
          );

        localStorage.setItem("accessToken", token);

        // ✅ (옵션이지만 강추) 내 정보 조회해서 이름 저장
        const meRes = await apiFetch("/api/user/me", {
          headers: { Accept: "application/json" },
        });

        const me = meRes?.data || null;
        const displayName = me?.nickname || me?.username || "현서";
        localStorage.setItem(ME_KEY, displayName);
        upsertUser(displayName);

        setMsg("완료! Rooms로 이동합니다...");
        navigate("/rooms", { replace: true });
      } catch (e) {
        localStorage.removeItem("accessToken");
        setMsg(e?.message || "로그인 실패");
      }
    };

    run();
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h1 className="text-lg font-semibold">카카오 로그인 처리</h1>
        <p className="text-sm text-gray-600 mt-2">{msg}</p>

        {msg.includes("실패") ||
        msg.includes("없습니다") ||
        msg.includes("오류") ? (
          <button
            className="mt-4 w-full rounded-xl bg-black text-white py-3"
            onClick={() => navigate("/login", { replace: true })}
          >
            로그인 화면으로
          </button>
        ) : null}
      </div>
    </div>
  );
}
