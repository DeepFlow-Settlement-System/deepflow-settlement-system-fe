/**
 * [LoginPage]
 * - 카카오 소셜 로그인 진입 페이지
 * - 현재는 더미 로그인 버튼만 제공
 * - 로그인 성공 시 /rooms 로 이동
 * - 실제 카카오 OAuth 연동 시, 이 페이지에서 처리
 */
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // 나중에 카카오 로그인 붙일자리
    localStorage.setItem("isLoggedIn", "true"); //더미 로그인 상태 저장
    navigate("/rooms");
  };
  return (
    <div style={{ padding: 16 }}>
      <h1>Login</h1>
      <button onClick={handleLogin}>카카오 로그인(더미)</button>
    </div>
  );
}
