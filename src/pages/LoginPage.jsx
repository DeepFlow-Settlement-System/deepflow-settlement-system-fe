// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { apiFetch } from "@/api/client";

export default function LoginPage() {
  const [err, setErr] = useState("");

  const onKakaoLogin = async () => {
    try {
      setErr("");

      const res = await apiFetch("/api/auth/login-url/kakao");
      const rawUrl = res?.data?.url ?? res?.url ?? null;

      if (!rawUrl) {
        console.log("login-url 응답:", res);
        throw new Error("로그인 URL을 받지 못했습니다. (data.url 없음)");
      }

      window.location.href = rawUrl;
    } catch (e) {
      setErr(e?.message || "로그인 요청 실패");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h1 className="text-xl font-semibold">Trip Split</h1>
        <p className="text-sm text-gray-600 mt-2">카카오로 로그인</p>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <b className="block mb-1">오류</b>
            {err}
          </div>
        ) : null}

        <button
          onClick={onKakaoLogin}
          className="mt-5 w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-semibold py-3 transition"
        >
          카카오로 시작하기
        </button>
      </div>
    </div>
  );
}
