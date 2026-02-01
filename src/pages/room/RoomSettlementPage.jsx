import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const EXPENSES_KEY = (roomId) => `expenses_v1_${roomId}`;
const STATUS_KEY = (roomId) => `settlement_status_v1_${roomId}`;
const ME_KEY = "user_name_v1";

const STATUS = {
  READY: "READY", // 요청 전
  REQUESTED: "REQUESTED", // 요청함
  DONE: "DONE", // 완료
};

function loadMe() {
  return localStorage.getItem(ME_KEY) || "현서";
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

function loadStatus(roomId) {
  try {
    const raw = localStorage.getItem(STATUS_KEY(roomId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStatus(roomId, obj) {
  localStorage.setItem(STATUS_KEY(roomId), JSON.stringify(obj));
}

// 지출 기반 균등분할 정산 계산:
// - 각 지출 amount를 participants 수로 나눔
// - payer는 amount를 paid에 더하고
// - 각 participant는 share를 owe에 더함
function computeNet(expenses) {
  const paid = new Map();
  const owe = new Map();

  const add = (map, name, v) => map.set(name, (map.get(name) || 0) + v);

  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    const payer = e.payerName || "미정";
    const participants =
      Array.isArray(e.participants) && e.participants.length > 0
        ? e.participants
        : [payer];

    const share = amount / participants.length;

    add(paid, payer, amount);
    for (const p of participants) add(owe, p, share);
  }

  const people = new Set([...paid.keys(), ...owe.keys()]);
  const net = new Map(); // +면 받을 돈, -면 보낼 돈
  for (const name of people) {
    const v = (paid.get(name) || 0) - (owe.get(name) || 0);
    // 부동소수 오차 줄이기
    net.set(name, Math.round(v));
  }
  return net;
}

// 전체 정산을 "누가 누구에게"로 만들되,
// 여기서는 "나(현재 사용자)가 받을 돈"만 뽑아서 요청 대상 리스트를 만든다.
function computeRequestsForMe(net, me) {
  const receivers = [];
  const payers = [];

  for (const [name, v] of net.entries()) {
    if (v > 0) receivers.push({ name, amount: v });
    else if (v < 0) payers.push({ name, amount: -v });
  }

  receivers.sort((a, b) => b.amount - a.amount);
  payers.sort((a, b) => b.amount - a.amount);

  // greedy matching
  const result = new Map(); // payerName -> amountToMe

  let rIdx = 0;
  for (const p of payers) {
    let remaining = p.amount;
    while (remaining > 0 && rIdx < receivers.length) {
      const r = receivers[rIdx];
      const send = Math.min(remaining, r.amount);

      // 이번 매칭이 "me에게 보내는 돈"이면 기록
      if (r.name === me) {
        result.set(p.name, (result.get(p.name) || 0) + send);
      }

      remaining -= send;
      r.amount -= send;
      if (r.amount === 0) rIdx += 1;
    }
  }

  // 정렬된 배열로 반환
  return Array.from(result.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export default function RoomSettlementPage() {
  const { roomId } = useParams();
  const me = loadMe();

  const expenses = useMemo(() => loadExpenses(roomId), [roomId]);
  const net = useMemo(() => computeNet(expenses), [expenses]);
  const requestTargetsBase = useMemo(
    () => computeRequestsForMe(net, me),
    [net, me],
  );

  const [statusMap, setStatusMap] = useState(() => loadStatus(roomId));
  const [notice, setNotice] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showNotice = (msg) => {
    setNotice(msg);
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(""), 2500);
  };

  // status 반영된 targets
  const requestTargets = useMemo(() => {
    return requestTargetsBase.map((t) => ({
      ...t,
      status: statusMap[t.name] || STATUS.READY,
    }));
  }, [requestTargetsBase, statusMap]);

  const readyTargets = useMemo(
    () => requestTargets.filter((t) => t.status === STATUS.READY),
    [requestTargets],
  );

  const persistStatus = (next) => {
    setStatusMap(next);
    saveStatus(roomId, next);
  };

  const requestOne = (name) => {
    const next = { ...statusMap, [name]: STATUS.REQUESTED };
    persistStatus(next);
    showNotice("정산 요청을 보냈습니다.");
  };

  const resendOne = (name) => {
    showNotice(`${name}님에게 정산 요청을 재전송했습니다.`);
  };

  const doneOne = (name) => {
    const next = { ...statusMap, [name]: STATUS.DONE };
    persistStatus(next);
    showNotice("완료 처리되었습니다.");
  };

  const openRequestAllModal = () => setIsModalOpen(true);
  const closeRequestAllModal = () => setIsModalOpen(false);

  const sendRequestAll = () => {
    // READY인 사람들만 REQUESTED로
    const next = { ...statusMap };
    for (const t of readyTargets) next[t.name] = STATUS.REQUESTED;
    persistStatus(next);

    showNotice("전체에게 정산 요청을 보냈습니다.");
    closeRequestAllModal();
  };

  const myNet = net.get(me) || 0;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>정산</h2>

      <div style={{ marginBottom: 8, color: "#555" }}>
        기준 사용자: <b>{me}</b>
      </div>

      {/* notice */}
      {notice && (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#e3f2fd",
            color: "#1976d2",
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              color: "#1976d2",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* 요약 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: "#777" }}>
          내 정산 결과(균등분할 기준)
        </div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {myNet >= 0 ? "받을 금액 " : "보낼 금액 "}
          {Math.abs(myNet).toLocaleString()}원
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={openRequestAllModal}
            disabled={readyTargets.length === 0}
          >
            한 번에(전부) 요청 보내기
          </button>
          {readyTargets.length === 0 && (
            <span style={{ color: "#777" }}>요청할 사람이 없습니다</span>
          )}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
          * 정산은 등록된 지출(결제자/참여자) 기반으로 계산됩니다.
        </div>
      </div>

      {/* 요청 리스트 */}
      {requestTargets.length === 0 ? (
        <div style={{ color: "#777" }}>
          현재 <b>{me}</b> 기준으로 요청할 대상이 없습니다. (받을 금액이 없거나,
          지출 데이터/참여자 정보가 부족할 수 있어요)
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {requestTargets.map((t) => (
            <div
              key={t.name}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                background: "white",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
                  요청 금액: {t.amount.toLocaleString()}원
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {t.status === STATUS.READY && (
                  <button onClick={() => requestOne(t.name)}>요청</button>
                )}

                {t.status === STATUS.REQUESTED && (
                  <>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#1976d2",
                        fontWeight: 800,
                      }}
                    >
                      요청됨
                    </span>
                    <button onClick={() => resendOne(t.name)}>재 전송</button>
                    <button onClick={() => doneOne(t.name)}>완료</button>
                  </>
                )}

                {t.status === STATUS.DONE && (
                  <span
                    style={{ fontSize: 12, color: "#16a34a", fontWeight: 900 }}
                  >
                    완료됨
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 전체 요청 모달 */}
      {isModalOpen && (
        <div
          onClick={closeRequestAllModal}
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
              maxWidth: 420,
              background: "white",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #eee",
            }}
          >
            <h3 style={{ marginTop: 0 }}>정산 요청 보내기</h3>

            <div style={{ marginTop: 12, fontWeight: 900 }}>요청 받는 사람</div>

            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {readyTargets.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 10,
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                  }}
                >
                  <span>{t.name}</span>
                  <span>{t.amount.toLocaleString()}원</span>
                </div>
              ))}

              {readyTargets.length === 0 && (
                <div style={{ color: "#777" }}>요청할 사람이 없습니다.</div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button onClick={closeRequestAllModal}>취소</button>
              <button
                onClick={sendRequestAll}
                disabled={readyTargets.length === 0}
              >
                전송
              </button>
            </div>

            <div style={{ marginTop: 10, color: "#777", fontSize: 12 }}>
              카카오톡으로 정산 요청 링크가 전송됩니다. (지금은 더미)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
