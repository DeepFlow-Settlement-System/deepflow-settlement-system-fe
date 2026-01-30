/**
 * [RoomSettingsPage]
 * - 방 설정 관리 페이지
 * - 방 정보 수정 (이름/이미지)
 * - 멤버 초대
 * - 방 나가기 (정산 미완료 시 제한)
 */
import { useNavigate } from "react-router-dom";

export default function RoomSettingsPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn"); // 로그인 상태 삭제
    navigate("/login"); // 로그인 페이지로 이동
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Settings</h2>

      <button onClick={handleLogout} style={{ marginTop: 12 }}>
        로그아웃(더미)
      </button>
    </div>
  );
}
