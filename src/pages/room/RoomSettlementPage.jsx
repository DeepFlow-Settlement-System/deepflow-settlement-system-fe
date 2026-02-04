// src/pages/room/RoomSettlementPage.jsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const EXPENSES_KEY_V2 = (roomId) => `expenses_v2_${roomId}`;
const EXPENSES_KEY_V1 = (roomId) => `expenses_v1_${roomId}`; // 과거 데이터 호환
const ME_KEY = "user_name_v1";

const SPLIT = {
  EQUAL: "EQUAL",
  ITEM: "ITEM",
};

const ITEM_SPLIT = {
  PER_PERSON: "PER_PERSON", // 1인당 가격
  TOTAL_SPLIT: "TOTAL_SPLIT", // 총액 n빵(총액/선택 인원)
};

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
}

function safeParseArray(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// v2 우선 + v1도 합쳐서 읽음(이전 데이터가 남아있어도 "되던 것" 유지)
function loadExpenses(roomId) {
  const raw2 = localStorage.getItem(EXPENSES_KEY_V2(roomId));
  const raw1 = localStorage.getItem(EXPENSES_KEY_V1(roomId));

  const a2 = raw2 ? safeParseArray(raw2) : [];
  const a1 = raw1 ? safeParseArray(raw1) : [];

  return [...a2, ...a1];
}

function addTransfer(map, from, to, amount) {
  if (!from || !to) return;
  if (from === to) return;

  const v = Math.round(Number(amount) || 0);
  if (v <= 0) return;

  const key = `${from}->${to}`;
  map.set(key, (map.get(key) || 0) + v);
}

/**
 * 총액을 users에게 나누되, "나머지 1원"을 앞 사람부터 +1씩 배분
 * 예: total=10001, users=3명 => [3334,3334,3333] (앞에서부터 1원씩)
 * 반환: Map(user -> shareWon)
 */
function splitTotalWithRemainder(total, users) {
  const arr = Array.isArray(users) ? users : [];
  const n = arr.length;
  const out = new Map();
  if (n === 0) return out;

  const T = Math.round(Number(total) || 0);
  if (T <= 0) return out;

  const base = Math.floor(T / n);
  const rem = T - base * n;

  arr.forEach((u) => out.set(u, base));
  for (let i = 0; i < rem; i++) {
    const u = arr[i % n];
    out.set(u, (out.get(u) || 0) + 1);
  }
  return out;
}

function computeTransfers(expenses) {
  const transfers = new Map();

  for (const e of expenses) {
    // ✅ 결제자 필드 호환
    const payer = e.payerName || e.payer || "미정";

    // ✅ splitType 없으면 items 있으면 ITEM으로 간주
    const splitType =
      e.splitType ||
      (Array.isArray(e.items) && e.items.length > 0 ? SPLIT.ITEM : SPLIT.EQUAL);

    // 1) ITEM(혼합 품목)
    if (splitType === SPLIT.ITEM) {
      const items = Array.isArray(e.items) ? e.items : [];

      for (const item of items) {
        const users = Array.isArray(item.users) ? item.users : [];
        if (users.length === 0) continue;

        // split이 없으면 레거시로 PER_PERSON 처리
        const itemSplit = item.split || ITEM_SPLIT.PER_PERSON;

        // (a) 총액 n빵: item.amount를 users에게 나눔
        if (itemSplit === ITEM_SPLIT.TOTAL_SPLIT) {
          const shares = splitTotalWithRemainder(item.amount, users);

          for (const u of users) {
            if (u === payer) continue; // payer는 본인 부담분 송금 X
            addTransfer(transfers, u, payer, shares.get(u) || 0);
          }
          continue;
        }

        // (b) 1인당 가격: 각 user가 payer에게 pricePerPerson 송금
        const price = Number(item.pricePerPerson) || 0;
        if (price <= 0) continue;

        for (const u of users) {
          if (u === payer) continue;
          addTransfer(transfers, u, payer, price);
        }
      }

      continue;
    }

    // 2) EQUAL(지출 전체 n빵)
    const total = Math.round(Number(e.amount) || 0);
    const participants =
      Array.isArray(e.participants) && e.participants.length > 0
        ? e.participants
        : [payer];

    const shares = splitTotalWithRemainder(total, participants);
    for (const u of participants) {
      if (u === payer) continue;
      addTransfer(transfers, u, payer, shares.get(u) || 0);
    }
  }

  return Array.from(transfers.entries())
    .map(([key, amount]) => {
      const [from, to] = key.split("->");
      return { from, to, amount: Math.round(amount) };
    })
    .sort((a, b) => b.amount - a.amount);
}

export default function RoomSettlementPage() {
  const { roomId } = useParams();
  const me = loadMe();

  const expenses = useMemo(() => loadExpenses(roomId), [roomId]);
  const transfers = useMemo(() => computeTransfers(expenses), [expenses]);

  const myTransfers = useMemo(
    () => transfers.filter((t) => t.from === me || t.to === me),
    [transfers, me],
  );

  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? transfers : myTransfers;

  const summary = useMemo(() => {
    let send = 0;
    let recv = 0;
    for (const t of myTransfers) {
      if (t.from === me) send += t.amount;
      if (t.to === me) recv += t.amount;
    }
    return { send, recv };
  }, [myTransfers, me]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>정산</h2>

      <div style={{ marginBottom: 8, color: "#555" }}>
        기준 사용자: <b>{me}</b>
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "#777" }}>내 기준 요약</div>
        <div
          style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}
        >
          <div>
            보낼 금액: <b>{summary.send.toLocaleString()}원</b>
          </div>
          <div>
            받을 금액: <b>{summary.recv.toLocaleString()}원</b>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            전체 송금표도 보기
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ color: "#777" }}>
          정산할 내역이 없습니다. (지출/품목/참여자 데이터를 확인해주세요)
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((t, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                background: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <b>{t.from}</b> → <b>{t.to}</b>
                <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                  {t.from === me
                    ? "내가 보내야 함"
                    : t.to === me
                      ? "내가 받아야 함"
                      : "전체 송금표"}
                </div>
              </div>
              <div style={{ fontWeight: 900 }}>
                {t.amount.toLocaleString()}원
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
