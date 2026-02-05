import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const USERS_KEY = "users_v1";
const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

function saveMembers(roomId, members) {
  localStorage.setItem(MEMBERS_KEY(roomId), JSON.stringify(members));
}

export default function RoomInvitePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const me = loadMe();

  const [users, setUsers] = useState(() => {
    const u = loadUsers();
    const base = u.includes(me) ? u : [me, ...u];
    saveUsers(base);
    return base;
  });

  const [members, setMembers] = useState(() => {
    const m = loadMembers(roomId);
    const base = m.length === 0 ? [me] : m;
    return base.includes(me) ? base : [me, ...base];
  });

  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const persistMembers = (next) => {
    const unique = Array.from(new Set(next));
    setMembers(unique);
    saveMembers(roomId, unique);
  };

  const toggleMember = (name) => {
    if (name === me) return;
    if (members.includes(name)) {
      persistMembers(members.filter((m) => m !== name));
    } else {
      persistMembers([...members, name]);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.toLowerCase().includes(q));
  }, [users, query]);

  const [newUser, setNewUser] = useState("");

  const addTestUser = () => {
    const name = newUser.trim();
    if (!name) return;
    if (users.includes(name)) {
      setNotice("이미 존재하는 유저입니다.");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }
    const next = [...users, name];
    setUsers(next);
    saveUsers(next);
    setNewUser("");
    setNotice(`${name} 유저를 추가했어요(더미).`);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const goRoomHome = () => navigate(`/rooms/${roomId}`, { replace: true });

  const handleKakaoInviteDummy = () => {
    alert(
      "카카오 친구 초대(B-2) 예정!\n지금은 B-1(앱 유저 목록)에서 선택하는 방식으로 구현했습니다.",
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>친구 초대</h2>

      <div style={{ color: "#555", marginBottom: 12 }}>
        방을 만들었어요! 아래에서 초대할 사람을 선택하세요.
      </div>

      {notice && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 10,
            background: "#e3f2fd",
            color: "#1976d2",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {notice}
        </div>
      )}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          maxWidth: 620,
          display: "grid",
          gap: 10,
        }}
      >
        <button
          onClick={handleKakaoInviteDummy}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "12px 14px",
            background: "#FEE500",
            color: "#111827",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          카카오 친구 불러오기 (추후 B-2)
        </button>

        <div style={{ fontSize: 12, color: "#777" }}>
          * 지금은 B-1(앱 유저 목록) 방식으로 구현되어 있어요.
          <br />* 나중에 가능하면 이 버튼이 “카카오 친구 목록 API”로 바뀝니다.
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          maxWidth: 620,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          (더미) 앱 유저 추가
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="예) 민수"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
          <button onClick={addTestUser} disabled={!newUser.trim()}>
            추가
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
          * 실제 서비스에서는 DB/카카오 친구목록에서 유저를 가져오게 됩니다.
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          maxWidth: 620,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          초대할 유저 선택(B-1)
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름으로 검색"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {filteredUsers.length === 0 ? (
            <div style={{ color: "#777" }}>검색 결과가 없습니다.</div>
          ) : (
            filteredUsers.map((u) => {
              const checked = members.includes(u);
              const disabled = u === me;
              return (
                <label
                  key={u}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #f0f0f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "white",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {u} {u === me ? "(나)" : ""}
                  </span>

                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleMember(u)}
                  />
                </label>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
          * 체크한 유저들이 이 방의 멤버가 됩니다.
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          maxWidth: 620,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>현재 방 멤버</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {members.map((m) => (
            <span
              key={m}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: "#f9fafb",
                fontWeight: 700,
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={goRoomHome}>나중에</button>
        <button onClick={goRoomHome} style={{ fontWeight: 900 }}>
          완료
        </button>
      </div>
    </div>
  );
}
