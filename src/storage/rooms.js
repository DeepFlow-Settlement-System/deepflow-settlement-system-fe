const ROOMS_KEY = "rooms_v2";
const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const EXPENSES_KEY_V2 = (roomId) => `expenses_v2_${roomId}`;
const EXPENSES_KEY_V1 = (roomId) => `expenses_v1_${roomId}`;
const STATUS_KEY = (roomId) => `settlement_status_v1_${roomId}`;

// inviteCode -> roomId 매핑
const INVITE_MAP_KEY = "invite_code_map_v1";

export function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRooms(rooms) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export function loadMembers(roomId) {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMembers(roomId, members) {
  localStorage.setItem(MEMBERS_KEY(roomId), JSON.stringify(members));
}

export function loadInviteMap() {
  try {
    const raw = localStorage.getItem(INVITE_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveInviteMap(map) {
  localStorage.setItem(INVITE_MAP_KEY, JSON.stringify(map));
}

export function generateInviteCode(len = 8) {
  // 헷갈리는 문자 제거 (I,O,1,0 등)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function findRoomById(roomId) {
  const id = String(roomId);
  const rooms = loadRooms();
  return rooms.find((r) => String(r.id) === id) || null;
}

export function upsertRoom(nextRoom) {
  const rooms = loadRooms();
  const id = String(nextRoom.id);

  const exists = rooms.some((r) => String(r.id) === id);
  const nextRooms = exists
    ? rooms.map((r) => (String(r.id) === id ? nextRoom : r))
    : [nextRoom, ...rooms];

  saveRooms(nextRooms);
  return nextRoom;
}

/**
 * ✅ roomId 기준으로 "초대코드가 없으면 생성하고" rooms + invite_map 둘 다 반영
 * - RoomInvitePage / RoomSettingsPage에서 공통으로 사용
 */
export function ensureInviteCodeForRoom(roomId) {
  const room = findRoomById(roomId);
  if (!room) return null;

  // 이미 inviteCode 있으면 map도 보정(혹시 누락됐을 수도)
  if (room.inviteCode) {
    const map = loadInviteMap();
    const k = String(room.inviteCode).toUpperCase();
    if (map[k] !== String(room.id)) {
      map[k] = String(room.id);
      saveInviteMap(map);
    }
    return room;
  }

  const map = loadInviteMap();
  let code = generateInviteCode(8);
  while (map[code]) code = generateInviteCode(8);

  map[code] = String(room.id);
  saveInviteMap(map);

  const nextRoom = { ...room, inviteCode: code };
  upsertRoom(nextRoom);

  return nextRoom;
}

export function findRoomByInviteCode(codeRaw) {
  const code = String(codeRaw || "")
    .trim()
    .toUpperCase();
  if (!code) return null;

  const map = loadInviteMap();
  const roomId = map[code];
  if (!roomId) return null;

  const room = findRoomById(roomId);
  return room ? { room, roomId: String(roomId), inviteCode: code } : null;
}

export function joinRoomByInviteCode({ inviteCode, me }) {
  const found = findRoomByInviteCode(inviteCode);
  if (!found) throw new Error("유효하지 않은 초대코드입니다.");

  const { roomId, room } = found;

  // 1) rooms_v2에 방이 없으면 추가
  const rooms = loadRooms();
  const exists = rooms.some((r) => String(r.id) === String(roomId));
  if (!exists) {
    saveRooms([room, ...rooms]);
  }

  // 2) 멤버에 나 추가
  const members = loadMembers(roomId);
  const nextMembers = Array.from(new Set([...(members || []), me]));
  saveMembers(roomId, nextMembers);

  return { roomId, room };
}

export function leaveRoom({ roomId, me }) {
  const id = String(roomId);

  // 1) members에서 나 제거
  const members = loadMembers(id);
  const nextMembers = members.filter((m) => m !== me);
  saveMembers(id, nextMembers);

  // 2) 내 rooms_v2 목록에서 방 제거
  const rooms = loadRooms();
  const nextRooms = rooms.filter((r) => String(r.id) !== id);
  saveRooms(nextRooms);

  // 3) 관련 로컬 데이터 정리(선택)
  localStorage.removeItem(EXPENSES_KEY_V2(id));
  localStorage.removeItem(EXPENSES_KEY_V1(id));
  localStorage.removeItem(STATUS_KEY(id));

  return { remainingMembers: nextMembers.length };
}
