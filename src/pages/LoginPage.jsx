// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { apiFetch } from "@/api/client";

export default function LoginPage() {
  const [err, setErr] = useState("");

  const onKakaoLogin = async () => {
    try {
      setErr("");

      // ✅ 스웨거: GET /api/auth/login-url/kakao
      const res = await apiFetch("/api/auth/login-url/kakao");

      // ✅ 스웨거 응답: { status, message, data: { url } }
      const url = res?.data?.url;
      if (!url)
        throw new Error("로그인 URL을 받지 못했습니다. (data.url 없음)");

      window.location.href = url;
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center font-bold">
            TS
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Trip Split</h1>
            <p className="text-sm text-gray-500 mt-1">
              여행 지출 기록 & 정산 요청
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4 leading-relaxed">
          여행 중 지출을 바로 기록하고, 원하는 시점에 정산 요청을 보낼 수
          있어요.
        </p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div>
            ✅ 로그인은 <b>카카오 계정</b>으로만 진행돼요.
          </div>
          <div className="mt-1">
            ✅ 자동 송금은 제공하지 않아요. (요청 링크 전송 방식)
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <b className="block mb-1">오류</b>
            {err}
            <div className="text-xs text-red-600 mt-1">
              (대부분 API_BASE_URL 설정/서버 문제거나, Redirect URI가
              백엔드/카카오 설정과 다를 때 발생)
            </div>
          </div>
        ) : null}

        <button
          onClick={onKakaoLogin}
          className="mt-5 w-full rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-semibold py-3 transition"
        >
          카카오로 시작하기
        </button>

        <div className="mt-4 text-xs text-gray-500 leading-relaxed">
          로그인 성공 후 콜백 페이지에서 토큰 발급을 마치면 Rooms로 이동합니다.
        </div>
      </div>
    </div>
  );
}
