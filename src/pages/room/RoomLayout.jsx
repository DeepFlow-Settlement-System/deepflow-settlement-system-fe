/**
 * [RoomLayout]
 * - 특정 방(roomId)에 대한 공통 레이아웃
 * - 상단 방 정보 + 탭 네비게이션 담당
 * - 실제 콘텐츠는 하위 Outlet에서 렌더링됨
 *
 * 포함하는 하위 페이지:
 *  - 홈 / 내역 / 등록 / 정산 / 설정
 */
import { NavLink, Outlet, useParams } from "react-router-dom";

export default function RoomLayout() {
  const { roomId } = useParams();
  const base = `/rooms/${roomId}`;

  return (
    <div>
      <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
        <h1 style={{ margin: 0 }}>Room #{roomId}</h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 16,
          borderBottom: "1px solid #eee",
        }}
      >
        <NavLink
          to={`${base}/home`}
          style={({ isActive }) => ({
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? "#1976d2" : "#333",
            textDecoration: "none",
          })}
        >
          홈
        </NavLink>

        <NavLink
          to={`${base}/expenses`}
          style={({ isActive }) => ({
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? "#1976d2" : "#333",
            textDecoration: "none",
          })}
        >
          내역
        </NavLink>

        <NavLink
          to={`${base}/add-expense`}
          style={({ isActive }) => ({
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? "#1976d2" : "#333",
            textDecoration: "none",
          })}
        >
          등록
        </NavLink>

        <NavLink
          to={`${base}/settlement`}
          style={({ isActive }) => ({
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? "#1976d2" : "#333",
            textDecoration: "none",
          })}
        >
          정산
        </NavLink>

        <NavLink
          to={`${base}/settings`}
          style={({ isActive }) => ({
            fontWeight: isActive ? "bold" : "normal",
            color: isActive ? "#1976d2" : "#333",
            textDecoration: "none",
          })}
        >
          설정
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
