import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "rooms_v2"; // v1 쓰고 있으면 키 바꿔서 충돌 방지 추천

function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function RoomsPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(() => loadRooms());
  const [isOpen, setIsOpen] = useState(false);

  const [roomName, setRoomName] = useState("");
  const today = toDateKey(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const canCreate = useMemo(() => {
    return (
      roomName.trim().length >= 1 &&
      startDate &&
      endDate &&
      startDate <= endDate
    );
  }, [roomName, startDate, endDate]);

  const openModal = () => {
    setRoomName("");
    setStartDate(today);
    setEndDate(today);
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  const goRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  const handleCreateRoom = () => {
    if (!canCreate) return;

    const newRoom = {
      id: String(Date.now()),
      name: roomName.trim(),
      tripStart: startDate,
      tripEnd: endDate,
      createdAt: new Date().toISOString(),
    };

    // ✅ 저장
    const nextRooms = [newRoom, ...rooms];
    setRooms(nextRooms);
    saveRooms(nextRooms);

    closeModal();

    // ✅ 여기로 이동!
    navigate(`/rooms/${newRoom.id}/invite`);
  };

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Rooms</h1>
        <button onClick={openModal}>+ 방 만들기</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rooms.length === 0 && (
          <div style={{ color: "#777" }}>
            아직 방이 없습니다. <b>+ 방 만들기</b>로 생성해보세요.
          </div>
        )}

        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => goRoom(r.id)}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #eee",
              background: "white",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
              일정: {r.tripStart ?? "?"} ~ {r.tripEnd ?? "?"}
            </div>
            <div style={{ fontSize: 12, color: "#777" }}>id: {r.id}</div>
          </button>
        ))}
      </div>

      {isOpen && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              background: "white",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #eee",
            }}
          >
            <h3 style={{ marginTop: 0 }}>방 만들기</h3>

            <label style={{ display: "block", fontWeight: 700, marginTop: 8 }}>
              방 이름
            </label>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="예) 제주도 여행"
              style={{
                width: "100%",
                marginTop: 6,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>여행 일정</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <span style={{ fontSize: 12, color: "#555" }}>시작</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </label>

                <label
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <span style={{ fontSize: 12, color: "#555" }}>종료</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                    }}
                  />
                </label>
              </div>

              {startDate > endDate && (
                <div style={{ fontSize: 12, color: "#b91c1c" }}>
                  시작일이 종료일보다 늦을 수 없어요.
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button onClick={closeModal}>취소</button>
              <button onClick={handleCreateRoom} disabled={!canCreate}>
                생성
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
              (더미) 방 정보는 localStorage에 저장됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
