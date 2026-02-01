import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

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

function saveMembers(roomId, members) {
  localStorage.setItem(MEMBERS_KEY(roomId), JSON.stringify(members));
}

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

function saveMe(name) {
  localStorage.setItem(ME_KEY, name);
}

export default function RoomSettingsPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [me, setMe] = useState(() => loadMe());
  const [members, setMembers] = useState(() => {
    const m = loadMembers(roomId);
    // 기본: 나를 멤버에 포함
    if (m.length === 0) return [loadMe()];
    if (!m.includes(loadMe())) return [loadMe(), ...m];
    return m;
  });

  const [newMember, setNewMember] = useState("");

  const canAdd = useMemo(() => newMember.trim().length >= 1, [newMember]);

  const persist = (next) => {
    setMembers(next);
    saveMembers(roomId, next);
  };

  const addMember = () => {
    if (!canAdd) return;
    const name = newMember.trim();
    if (members.includes(name)) return;
    persist([...members, name]);
    setNewMember("");
  };

  const removeMember = (name) => {
    // 나 자신은 최소 1명은 남기기
    const next = members.filter((m) => m !== name);
    if (next.length === 0) return;
    persist(next);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login", { replace: true });
  };

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert("초대 링크가 복사되었습니다! (더미)");
    } catch {
      window.prompt("아래 링크를 복사해서 공유하세요:", inviteLink);
    }
  };

  const updateMe = () => {
    const next = me.trim() || "현서";
    setMe(next);
    saveMe(next);
    // 멤버에도 반영(간단처리: 기존 me 이름이 멤버에 있으면 치환)
    const old = loadMe();
    const replaced = members.map((m) => (m === old ? next : m));
    persist(Array.from(new Set(replaced)));
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>내 이름(더미)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={me}
              onChange={(e) => setMe(e.target.value)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
            <button onClick={updateMe}>저장</button>
          </div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
            정산 계산에서 “내가 받을 금액/내가 보낼 금액” 기준 이름으로
            사용합니다.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>멤버(더미)</div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="추가할 멤버 이름"
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
            <button onClick={addMember} disabled={!canAdd}>
              추가
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {members.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{m}</span>
                <button
                  onClick={() => removeMember(m)}
                  disabled={members.length <= 1}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
            참여자 체크/정산 계산에 사용됩니다.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>친구 초대</div>
          <button onClick={handleCopyInviteLink}>초대 링크 복사 (더미)</button>
          <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
            나중에 카카오 공유 SDK 붙이면 “카카오로 공유”로 확장 가능.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>계정</div>
          <button onClick={handleLogout}>로그아웃(더미)</button>
        </div>
      </div>
    </div>
  );
}
