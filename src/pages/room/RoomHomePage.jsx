import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ROOMS_KEY = "rooms_v2"; // RoomsPage에서 사용한 키랑 동일해야 함
const EXPENSES_KEY = (roomId) => `expenses_v1_${roomId}`;

function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadExpenses(roomId) {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function startOfDay(dateKey) {
  // dateKey: "YYYY-MM-DD"
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(dateKey) {
  const dt = startOfDay(dateKey);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function toDateKey(input) {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(dateKey, delta) {
  const d = startOfDay(dateKey);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

// tripStart ~ tripEnd 사이 날짜 배열 만들기
function buildDateRange(startKey, endKey) {
  if (!startKey || !endKey) return [];
  if (startKey > endKey) return [];
  const out = [];
  let cur = startKey;
  while (cur <= endKey) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export default function RoomHomePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState(() => loadExpenses(roomId));

  // 방 정보에서 여행기간 읽기
  const room = useMemo(() => {
    const rooms = loadRooms();
    return rooms.find((r) => String(r.id) === String(roomId)) || null;
  }, [roomId]);

  const tripStart = room?.tripStart; // "YYYY-MM-DD"
  const tripEnd = room?.tripEnd; // "YYYY-MM-DD"

  // 날짜 리스트(2/1~2/5 같은)
  const dateList = useMemo(
    () => buildDateRange(tripStart, tripEnd),
    [tripStart, tripEnd],
  );

  // 보기 모드
  // - LIST: 기간 전체를 한꺼번에
  // - DAY: 날짜 버튼으로 하루씩 선택해서 보기
  const [viewMode, setViewMode] = useState("LIST");

  // DAY 모드에서 선택된 날짜 (기본: 여행 시작일)
  const [selectedDate, setSelectedDate] = useState(() => tripStart || "");

  // room/tripStart 바뀌면 selectedDate도 초기화
  useEffect(() => {
    setSelectedDate(tripStart || "");
  }, [tripStart]);

  // add-expense에서 저장하고 돌아왔을 때 반영
  useEffect(() => {
    setExpenses(loadExpenses(roomId));
  }, [roomId]);

  // 여행기간으로 필터링 (홈에서는 항상 tripStart~tripEnd를 기본으로 적용)
  const inTripRange = useMemo(() => {
    // 여행기간이 없으면 그냥 전체(안전장치)
    if (!tripStart || !tripEnd) return expenses;

    const s = startOfDay(tripStart);
    const e = endOfDay(tripEnd);

    return expenses.filter((it) => {
      const dt = new Date(it.date);
      return dt >= s && dt <= e;
    });
  }, [expenses, tripStart, tripEnd]);

  // 선택한 하루 필터링(DAY 모드)
  const inSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const s = startOfDay(selectedDate);
    const e = endOfDay(selectedDate);

    return inTripRange.filter((it) => {
      const dt = new Date(it.date);
      return dt >= s && dt <= e;
    });
  }, [inTripRange, selectedDate]);

  // 날짜별 그룹핑(기간 전체를 날짜별 섹션으로 보여주고 싶을 때도 쓸 수 있음)
  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const e of inTripRange) {
      const key = e.dateKey ?? toDateKey(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1)); // 최신 날짜 먼저
    return keys.map((k) => [k, map.get(k)]);
  }, [inTripRange]);

  const totalAmount = useMemo(() => {
    return inTripRange.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [inTripRange]);

  const goAdd = () => navigate(`/rooms/${roomId}/add-expense`);
  const goSettlement = () => navigate(`/rooms/${roomId}/settlement`);

  const card = (e) => (
    <div
      key={e.id}
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        background: "white",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{e.title}</div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
          날짜: {e.dateKey ?? toDateKey(e.date)} · 결제자:{" "}
          {e.payerName || "미정"}
        </div>
      </div>
      <div style={{ fontWeight: 900 }}>
        {Number(e.amount).toLocaleString()}원
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      {/* 상단 요약 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#777" }}>여행 기간</div>
            <div style={{ fontWeight: 900 }}>
              {tripStart && tripEnd
                ? `${tripStart} ~ ${tripEnd}`
                : "여행 기간 정보 없음"}
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
              기간 총 지출
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {totalAmount.toLocaleString()}원
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={goAdd}>+ 지출 등록</button>
            <button onClick={goSettlement}>정산</button>
          </div>
        </div>

        {/* 보기 모드 토글 */}
        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            onClick={() => setViewMode("LIST")}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: viewMode === "LIST" ? "#e3f2fd" : "white",
              cursor: "pointer",
            }}
          >
            전체 내역
          </button>

          <button
            onClick={() => setViewMode("DAY")}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: viewMode === "DAY" ? "#e3f2fd" : "white",
              cursor: "pointer",
            }}
            disabled={dateList.length === 0}
          >
            날짜별 보기
          </button>
        </div>

        {/* DAY 모드일 때만 날짜 버튼 */}
        {viewMode === "DAY" && (
          <div
            style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {dateList.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background: selectedDate === d ? "#111827" : "white",
                  color: selectedDate === d ? "white" : "#111827",
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div style={{ marginTop: 12 }}>
        {/* 여행기간이 없으면 안내 */}
        {!tripStart || !tripEnd ? (
          <div style={{ color: "#b91c1c" }}>
            방에 여행 기간(tripStart/tripEnd)이 저장되어 있지 않습니다.
            RoomsPage 저장 로직을 확인해주세요.
          </div>
        ) : inTripRange.length === 0 ? (
          <div style={{ color: "#777", padding: 12 }}>
            여행 기간 내 지출이 없습니다. <b>+ 지출 등록</b>으로 추가해보세요.
          </div>
        ) : viewMode === "LIST" ? (
          // ✅ 전체 내역: 기간 전체를 한꺼번에
          <div style={{ display: "grid", gap: 8 }}>
            {inTripRange
              .slice()
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map(card)}
          </div>
        ) : (
          // ✅ 날짜별 보기: 날짜 버튼으로 하루 선택
          <div>
            <div style={{ fontWeight: 900, margin: "6px 0" }}>
              {selectedDate || "(날짜 선택)"}
            </div>

            {inSelectedDay.length === 0 ? (
              <div style={{ color: "#777", padding: 12 }}>
                선택한 날짜에 지출이 없습니다.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {inSelectedDay
                  .slice()
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .map(card)}
              </div>
            )}

            {/* 참고: 만약 "날짜별 섹션(아코디언)으로 한 번에"가 좋으면 groupedByDay로 바꾸면 됨 */}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
        (더미) 홈은 방 생성 시 저장한 여행 기간을 자동 적용합니다.
      </div>
    </div>
  );
}
