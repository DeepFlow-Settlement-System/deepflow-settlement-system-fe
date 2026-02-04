// src/pages/room/RoomHomePage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const ROOMS_KEY = "rooms_v2";
const EXPENSES_KEY = (roomId) => `expenses_v2_${roomId}`;

const SPLIT = {
  EQUAL: "EQUAL",
  ITEM: "ITEM",
};

const ITEM_SPLIT = {
  PER_PERSON: "PER_PERSON",
  TOTAL_SPLIT: "TOTAL_SPLIT",
};

function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadExpenses(roomId) {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY(roomId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(key) {
  const dt = startOfDay(key);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function buildDateRange(start, end) {
  if (!start || !end) return [];
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    const d = startOfDay(cur);
    d.setDate(d.getDate() + 1);
    cur = toDateKey(d);
  }
  return out;
}

/** ⭐ 혼합 정산 총합 계산 (핵심) */
function calcExpenseTotal(e) {
  if (e.splitType !== SPLIT.ITEM) {
    return Number(e.amount) || 0;
  }

  const items = Array.isArray(e.items) ? e.items : [];
  return items.reduce((sum, it) => {
    const users = Array.isArray(it.users) ? it.users : [];
    const n = users.length;
    const split = it.split || ITEM_SPLIT.PER_PERSON;

    if (split === ITEM_SPLIT.TOTAL_SPLIT) {
      return sum + (Number(it.amount) || 0);
    }

    return sum + (Number(it.pricePerPerson) || 0) * n;
  }, 0);
}

export default function RoomHomePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [expenses, setExpenses] = useState(() => loadExpenses(roomId));

  const room = useMemo(() => {
    return loadRooms().find((r) => String(r.id) === String(roomId)) || {};
  }, [roomId]);

  const tripStart = room.tripStart;
  const tripEnd = room.tripEnd;

  const dateList = useMemo(
    () => buildDateRange(tripStart, tripEnd),
    [tripStart, tripEnd],
  );

  const [viewMode, setViewMode] = useState("LIST");
  const [selectedDate, setSelectedDate] = useState(tripStart || "");

  useEffect(() => {
    setExpenses(loadExpenses(roomId));
  }, [roomId, location.key]);

  useEffect(() => {
    setSelectedDate(tripStart || "");
  }, [tripStart]);

  const inTripRange = useMemo(() => {
    if (!tripStart || !tripEnd) return expenses;
    const s = startOfDay(tripStart);
    const e = endOfDay(tripEnd);
    return expenses.filter((x) => {
      const d = new Date(x.date);
      return d >= s && d <= e;
    });
  }, [expenses, tripStart, tripEnd]);

  const inSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const s = startOfDay(selectedDate);
    const e = endOfDay(selectedDate);
    return inTripRange.filter((x) => {
      const d = new Date(x.date);
      return d >= s && d <= e;
    });
  }, [inTripRange, selectedDate]);

  const totalAmount = useMemo(
    () => inTripRange.reduce((s, e) => s + calcExpenseTotal(e), 0),
    [inTripRange],
  );

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
      }}
    >
      <div>
        <div style={{ fontWeight: 800 }}>{e.title}</div>
        <div style={{ fontSize: 12, color: "#777" }}>
          날짜: {e.dateKey ?? toDateKey(e.date)} · 결제자: {e.payerName}
        </div>
      </div>
      <div style={{ fontWeight: 900 }}>
        {calcExpenseTotal(e).toLocaleString()}원
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      {/* 상단 요약 */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>
          여행 기간:{" "}
          {tripStart && tripEnd ? `${tripStart} ~ ${tripEnd}` : "미정"}
        </div>
        <div style={{ marginTop: 8 }}>
          기간 총 지출: <b>{totalAmount.toLocaleString()}원</b>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/rooms/${roomId}/add-expense`)}>
            + 지출 등록
          </button>
          <button onClick={() => navigate(`/rooms/${roomId}/settlement`)}>
            정산
          </button>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => setViewMode("LIST")}>전체 내역</button>
          <button
            onClick={() => setViewMode("DAY")}
            disabled={!dateList.length}
          >
            날짜별 보기
          </button>
        </div>

        {viewMode === "DAY" && (
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            {dateList.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                style={{
                  background: d === selectedDate ? "#111827" : "white",
                  color: d === selectedDate ? "white" : "#111827",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {viewMode === "LIST" &&
          (inTripRange.length === 0 ? (
            <div style={{ color: "#777" }}>지출이 없습니다.</div>
          ) : (
            inTripRange.map(card)
          ))}

        {viewMode === "DAY" &&
          (inSelectedDay.length === 0 ? (
            <div style={{ color: "#777" }}>선택한 날짜에 지출이 없습니다.</div>
          ) : (
            inSelectedDay.map(card)
          ))}
      </div>
    </div>
  );
}
