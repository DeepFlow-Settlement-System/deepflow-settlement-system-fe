/**
 * [RoomSettlementPage]
 * - 정산 결과 화면
 * - 내가 받아야 할 금액만 표시
 * - 요청 / 재전송 / 완료 상태 관리
 * - '전체에게 요청 보내기' 기능 제공
 */
import { useNavigate, useParams } from "react-router-dom";

export default function RoomSettlementPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const handleRequestAll = () => {
    // 나중에 카카오 링크 전송 붙일 자리
    alert("전체에게 정산 요청을 보냈습니다! (더미)");
    navigate(`/rooms/${roomId}/home`);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Settlement</h2>
      <button onClick={handleRequestAll}>전체에게 요청 보내기(더미)</button>
    </div>
  );
}
