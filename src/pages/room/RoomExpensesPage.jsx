/**
 * [RoomExpensesPage]
 * - 방의 전체 지출 내역 리스트 페이지
 * - 날짜별 / 전체 필터 제공
 * - 각 지출 클릭 시 상세 보기 가능(추후)
 * - 내가 보내야/받아야 할 금액 요약 표시 가능
 */
import { useNavigate, useParams } from "react-router-dom";

export default function RoomExpensesPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const handleSave = () => {
    // 나중에 지출 저장 로직 붙일자리
    navigate(`/rooms/${roomId}/expense`);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Expenses</h2>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSave}>저장(더미)</button>
      </div>
    </div>
  );
}
