// src/pages/AuthCallbackPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { kakaoLoginWithCode, getMe } from "@/api/auth";

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

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [status, setStatus] = useState("LOADING"); // LOADING | ERROR
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const code = params.get("code");
        const err = params.get("error");
        const errDesc = params.get("error_description");

        if (err) {
          throw new Error(errDesc || err || "카카오 로그인 오류");
        }
        if (!code) {
          throw new Error(
            "인가 코드(code)가 없습니다. Redirect URI 설정을 확인하세요.",
          );
        }

        // 1) code -> accessToken 발급
        const accessToken = await kakaoLoginWithCode(code);
        localStorage.setItem("accessToken", accessToken);

        // (기존 더미 로직 호환용: token 키도 필요하면 유지)
        // localStorage.setItem("token", accessToken);

        // 2) 내 정보 조회 (Bearer 필요)
        const meRes = await getMe();
        const me = meRes?.data || null;

        // 프로젝트에서 "내 이름"은 user_name_v1로 쓰고 있으니 맞춰 저장
        const displayName = me?.nickname || me?.username || "현서";
        localStorage.setItem(ME_KEY, displayName);
        upsertUser(displayName);

        // 3) 로그인 완료
        navigate("/rooms", { replace: true });
      } catch (e) {
        localStorage.removeItem("accessToken");
        setStatus("ERROR");
        setError(e?.message || "로그인 처리 실패");
      }
    };

    run();
  }, [navigate, params]);

  if (status === "ERROR") {
    return (
      <div style={{ padding: 16 }}>
        <h2>로그인 실패</h2>
        <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>
        <button style={{ marginTop: 12 }} onClick={() => navigate("/login")}>
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>로그인 처리 중...</h2>
      <div style={{ color: "#666", marginTop: 8 }}>잠시만 기다려 주세요.</div>
    </div>
  );
}
