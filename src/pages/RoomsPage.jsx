/**
 * [RoomsPage]
 * - 내가 속한 방(정산 그룹) 목록 페이지
 * - 각 방 클릭 시 해당 방 상세(/rooms/:roomId)로 이동
 * - 방 생성 버튼 제공 (/rooms/new 예정)
 */

import { Link } from "react-router-dom";

export default function RoomsPage() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Rooms</h1>

      <div style={{ display: "flex", gap: 8 }}>
        <Link to="/rooms/1">방 1 들어가기(더미)</Link>
        <Link to="/rooms/2">방 2 들어가기(더미)</Link>
      </div>
    </div>
  );
}
