import { NavLink, Outlet, useParams } from "react-router-dom";

export default function RoomLayout() {
  const { roomId } = useParams();
  const base = `/rooms/${roomId}`;

  const linkStyle = ({ isActive }) => ({
    fontWeight: isActive ? "bold" : "normal",
    color: isActive ? "#1976d2" : "#333",
    textDecoration: "none",
  });

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
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <NavLink to={base} end style={linkStyle}>
          홈
        </NavLink>
        <NavLink to={`${base}/add-expense`} style={linkStyle}>
          등록
        </NavLink>
        <NavLink to={`${base}/settlement`} style={linkStyle}>
          정산
        </NavLink>
        <NavLink to={`${base}/settings`} style={linkStyle}>
          설정
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
