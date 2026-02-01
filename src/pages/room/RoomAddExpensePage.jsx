import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EXPENSES_KEY = (roomId) => `expenses_v1_${roomId}`;
const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

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
function saveExpenses(roomId, expenses) {
  localStorage.setItem(EXPENSES_KEY(roomId), JSON.stringify(expenses));
}

function loadMembers(roomId) {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function RoomAddExpensePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const members = useMemo(() => {
    const m = loadMembers(roomId);
    if (m.length === 0) return [loadMe()];
    return m;
  }, [roomId]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [payerName, setPayerName] = useState(() => loadMe());

  // ✅ 기본: 전원 참여
  const [participants, setParticipants] = useState(() => members);

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 && Number(amount) > 0 && participants.length > 0
    );
  }, [title, amount, participants]);

  const toggleParticipant = (name) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const handleSave = () => {
    if (!canSave) return;

    const prev = loadExpenses(roomId);

    const item = {
      id: String(Date.now()),
      title: title.trim(),
      amount: Number(amount),
      date: new Date(date).toISOString(),
      dateKey: date,
      payerName,
      participants, // ✅ 정산에 필요한 핵심 데이터
      createdAt: new Date().toISOString(),
    };

    saveExpenses(roomId, [item, ...prev]);

    navigate(`/rooms/${roomId}`, { replace: true });
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>지출 등록</h2>

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label style={{ fontWeight: 800 }}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 편의점, 숙소, 택시"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label style={{ fontWeight: 800 }}>
          금액
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예) 12000"
            inputMode="numeric"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label style={{ fontWeight: 800 }}>
          날짜
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label style={{ fontWeight: 800 }}>
          결제자
          <select
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          >
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontWeight: 800, marginTop: 6 }}>참여자</div>
        <div
          style={{
            display: "grid",
            gap: 8,
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          {members.map((m) => (
            <label
              key={m}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={participants.includes(m)}
                onChange={() => toggleParticipant(m)}
              />
              <span>{m}</span>
            </label>
          ))}
          {participants.length === 0 && (
            <div style={{ fontSize: 12, color: "#b91c1c" }}>
              참여자를 최소 1명 이상 선택하세요.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <button onClick={() => navigate(-1)}>취소</button>
          <button onClick={handleSave} disabled={!canSave}>
            저장
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#777" }}>
          (더미) 현재는 “균등 분할”을 기본으로 정산합니다. (분배 방식은 추후
          확장)
        </div>
      </div>
    </div>
  );
}
