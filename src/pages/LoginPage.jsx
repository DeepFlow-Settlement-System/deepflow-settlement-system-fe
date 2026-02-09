import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");

  const onDevBypassLogin = () => {
    try {
      setErr("");

      // ✅ 개발 중 기능 테스트용 더미 토큰
      localStorage.setItem("accessToken", "dev-token");

      // 너 코드에서 loadMe()가 user_name_v1을 읽음 → 없으면 기본값(현서) 세팅
      if (!localStorage.getItem("user_name_v1")) {
        localStorage.setItem("user_name_v1", "현서");
      }

      navigate("/rooms", { replace: true });
    } catch (e) {
      setErr(e?.message || "DEV 로그인 우회 실패");
    }
  };

  const onKakaoLogin = async () => {
    try {
      setErr("");

      const res = await apiFetch("/api/auth/login-url/kakao");
      const rawUrl = res?.data?.url ?? res?.url ?? null;

      if (!rawUrl) {
        console.log("login-url 응답:", res);
        throw new Error("로그인 URL을 받지 못했습니다. (data.url 없음)");
      }

      // ✅ 디버깅용(필요 시)
      console.log(
        "kakao login url:",
        rawUrl,
        rawUrl.replace("http://t2.mobidic.shop:12345", "http://localhost:3000"),
      );

      if (isDev) {
        window.location.href = rawUrl.replace(
          "http://t2.mobidic.shop:12345",
          "http://localhost:3000",
        );
      } else {
        window.location.href = rawUrl;
      }
    } catch (e) {
      console.error("onKakaoLogin error:", e);
      setErr(e?.message || "로그인 요청 실패");
    }
  };

  // ✅ DEV에서는 카카오 로그인 누르면 배포(옛 빌드)로 튕길 수 있으니 막자
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h1 className="text-xl font-semibold">Trip Split</h1>
        <p className="text-sm text-gray-600 mt-2">
          {isDev ? "로컬 개발 모드 (로그인 우회 권장)" : "카카오로 로그인"}
        </p>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <b className="block mb-1">오류</b>
            {err}
          </div>
        ) : null}

        {/* ✅ DEV 전용: 로그인 우회 */}
        {isDev && (
          <button
            onClick={onDevBypassLogin}
            className="mt-5 w-full rounded-xl bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-semibold py-3 transition"
            type="button"
          >
            (DEV) 로그인 우회하고 시작하기
          </button>
        )}

        {/* ✅ PROD에서만 카카오 로그인 버튼 활성 */}
        <button
          onClick={onKakaoLogin}
          // disabled={isDev}
          className={[
            "mt-3 w-full rounded-xl font-semibold py-3 transition",
            "bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black",
          ].join(" ")}
          type="button"
        >
          카카오로 시작하기
        </button>

        {isDev && (
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>
              * 로컬에는 백엔드가 없어서 카카오 OAuth를 누르면 배포로
              리다이렉트되어 옛 빌드 화면이 보일 수 있어요.
            </div>
            <div>* 로컬 개발은 위 “로그인 우회”로 진행하세요.</div>
          </div>
        )}
      </div>
    </div>
  );
}
