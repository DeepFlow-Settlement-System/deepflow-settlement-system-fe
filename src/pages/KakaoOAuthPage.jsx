// src/pages/KakaoOAuthPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/api/client";

export default function KakaoOAuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState("로그인 처리 중...");

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return; // ✅ StrictMode 2번 실행 방지
    didRun.current = true;

    const run = async () => {
      try {
        const code = params.get("code");
        const err = params.get("error");
        const errDesc = params.get("error_description");

        if (err) throw new Error(errDesc || err || "카카오 로그인 오류");
        if (!code) throw new Error("인가 코드(code)가 없습니다.");

        // ✅ code -> accessToken
        const res = await apiFetch(
          `/api/auth/v1/oauth2/kakao?code=${encodeURIComponent(code)}`,
        );

        const token = res?.data?.accessToken ?? res?.accessToken ?? null;
        if (!token) throw new Error("accessToken을 받지 못했습니다.");

        localStorage.setItem("accessToken", token);

        setMsg("완료! Rooms로 이동합니다...");
        navigate("/rooms", { replace: true });
      } catch (e) {
        // ❗여기서 토큰을 지우면 '2번째 실패' 때 토큰이 날아가서 무한 튕김됨
        // localStorage.removeItem("accessToken");  // ✅ 일단 지우지 말고 로그만 보자
        console.error(e);
        setMsg(e?.message || "로그인 실패");
        navigate("/login", { replace: true });
      }
    };

    run();
  }, [navigate, params]);

  return <div>{msg}</div>;
}
