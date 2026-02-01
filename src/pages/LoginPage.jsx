/**
 * [LoginPage]
 * - 카카오 소셜 로그인만 제공 (MVP)
 * - 지금은 더미 버튼 (나중에 카카오 로그인 연동)
 */
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // TODO: 나중에 카카오 로그인 성공 후 처리
    console.log("login clicked");

    // 더미 로그인 통과 처리
    localStorage.setItem("isLoggedIn", "true");

    // rooms로 이동
    navigate("/rooms", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 16,
          padding: 20,
          border: "1px solid #eee",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* 로고/타이틀 영역 */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#111827",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            TS
          </div>

          <h1 style={{ margin: "12px 0 6px", fontSize: 24 }}>Trip Split</h1>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            여행 중 지출을 바로 기록하고,
            <br />
            원하는 시점에 정산 요청을 보낼 수 있어요.
          </p>
        </div>

        {/* 안내 박스 */}
        <div
          style={{
            background: "#f3f4f6",
            borderRadius: 12,
            padding: 12,
            color: "#374151",
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          ✔ 로그인은 <b>카카오 계정</b>으로만 진행돼요.
          <br />✔ 자동 송금은 제공하지 않아요. (요청 링크 전송 방식)
        </div>

        {/* 카카오 로그인 버튼(더미) */}
        <button
          type="button"
          onClick={handleLogin}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 12,
            padding: "12px 14px",
            background: "#FEE500",
            color: "#111827",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {/* 아이콘 자리 (나중에 카카오 아이콘 넣기) */}
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              background: "#111827",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            K
          </span>
          카카오로 시작하기 (더미)
        </button>

        {/* 작은 안내 */}
        <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
          로그인 버튼은 현재 더미입니다. (API 연결 시 실제 카카오 로그인으로
          교체)
        </div>
      </div>
    </div>
  );
}
