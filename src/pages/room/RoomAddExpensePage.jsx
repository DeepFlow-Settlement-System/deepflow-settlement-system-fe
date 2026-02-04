// src/pages/room/RoomAddExpensePage.jsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, authHeaders } from "../../api/client";

const EXPENSES_KEY = (roomId) => `expenses_v2_${roomId}`;
const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

const SPLIT = {
  EQUAL: "EQUAL", // 지출 전체 n빵
  ITEM: "ITEM", // 품목 혼합(각 품목이 PER_PERSON 또는 TOTAL_SPLIT)
};

const ITEM_SPLIT = {
  PER_PERSON: "PER_PERSON", // 1인당 가격
  TOTAL_SPLIT: "TOTAL_SPLIT", // 품목 총액 n빵(총액/선택 인원)
};

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

function newItem(members) {
  return {
    id: String(Date.now()) + Math.random().toString(16).slice(2),
    name: "",
    split: ITEM_SPLIT.PER_PERSON,
    pricePerPerson: "",
    amount: "", // TOTAL_SPLIT용
    users: members.length ? [members[0]] : [],
  };
}

/** OCR 응답(미정)을 최대한 방어적으로 표준 형태로 변환 */
function normalizeOcrAnalysis(raw) {
  // raw가 ApiResponse이면 raw.data가 실제일 가능성
  const data = raw?.data ?? raw ?? {};

  const title =
    data.storeName || data.merchantName || data.shopName || data.title || "";

  const dateKey =
    data.dateKey ||
    data.date ||
    (data.purchasedAt ? toDateKey(data.purchasedAt) : "") ||
    "";

  const total = Number(data.total || data.totalAmount || data.sum || 0) || 0;

  let items = [];
  const srcItems = data.items || data.lines || data.products || [];
  if (Array.isArray(srcItems)) {
    items = srcItems
      .map((it) => ({
        name: it.name || it.itemName || it.productName || "",
        amount: Number(it.amount || it.total || it.price || 0) || 0,
      }))
      .filter((it) => it.name || it.amount > 0);
  }

  return { title, dateKey, total, items };
}

/** 서버에서 expenseId 찾기 (응답 구조가 미정이라 fallback 여러 개) */
function extractExpenseId(resJson) {
  const d = resJson?.data ?? resJson ?? {};
  return d.expenseId || d.id || d.expense?.id || d.expense?.expenseId || null;
}

export default function RoomAddExpensePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // ⚠️ 임시: groupId가 roomId와 동일하다고 가정
  const groupId = roomId;

  const members = useMemo(() => {
    const m = loadMembers(roomId);
    if (m.length === 0) return [loadMe()];
    return m;
  }, [roomId]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [payerName, setPayerName] = useState(() => loadMe());

  const [splitType, setSplitType] = useState(SPLIT.ITEM);

  // 지출 전체 n빵용
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState(() => members);

  const toggleParticipant = (name) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  // 품목 혼합용
  const [items, setItems] = useState(() => [newItem(members)]);

  const addItem = () => setItems((prev) => [...prev, newItem(members)]);
  const removeItem = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const updateItem = (id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  const toggleItemUser = (itemId, user) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const users = Array.isArray(it.users) ? it.users : [];
        const nextUsers = users.includes(user)
          ? users.filter((u) => u !== user)
          : [...users, user];
        return { ...it, users: nextUsers };
      }),
    );
  };

  // ✅ 혼합 품목 총합 계산
  const totalItemsAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const usersCnt = Array.isArray(it.users) ? it.users.length : 0;
      const split = it.split || ITEM_SPLIT.PER_PERSON;

      if (split === ITEM_SPLIT.TOTAL_SPLIT) {
        return sum + (Number(it.amount) || 0);
      }
      return sum + (Number(it.pricePerPerson) || 0) * usersCnt;
    }, 0);
  }, [items]);

  const canSave = useMemo(() => {
    if (title.trim().length === 0) return false;

    if (splitType === SPLIT.EQUAL) {
      if (!(Number(amount) > 0)) return false;
      if (!participants || participants.length === 0) return false;
      return true;
    }

    // 품목 혼합
    if (!items || items.length === 0) return false;

    for (const it of items) {
      if ((it.name || "").trim().length === 0) return false;
      if (!Array.isArray(it.users) || it.users.length === 0) return false;

      const split = it.split || ITEM_SPLIT.PER_PERSON;
      if (split === ITEM_SPLIT.TOTAL_SPLIT) {
        if (!(Number(it.amount) > 0)) return false;
      } else {
        if (!(Number(it.pricePerPerson) > 0)) return false;
      }
    }

    return totalItemsAmount > 0;
  }, [title, splitType, amount, participants, items, totalItemsAmount]);

  const handleSave = () => {
    if (!canSave) return;

    const prev = loadExpenses(roomId);

    const base = {
      id: String(Date.now()),
      title: title.trim(),
      payerName,
      date: new Date(date).toISOString(),
      dateKey: date,
      createdAt: new Date().toISOString(),
      splitType,
    };

    const expense =
      splitType === SPLIT.EQUAL
        ? {
            ...base,
            amount: Number(amount),
            participants: participants.slice(),
            items: [],
          }
        : {
            ...base,
            amount: totalItemsAmount,
            participants: [],
            items: items.map((it) => ({
              id: it.id,
              name: (it.name || "").trim(),
              split: it.split || ITEM_SPLIT.PER_PERSON,
              pricePerPerson:
                (it.split || ITEM_SPLIT.PER_PERSON) === ITEM_SPLIT.PER_PERSON
                  ? Number(it.pricePerPerson)
                  : 0,
              amount:
                (it.split || ITEM_SPLIT.PER_PERSON) === ITEM_SPLIT.TOTAL_SPLIT
                  ? Number(it.amount)
                  : 0,
              users: Array.isArray(it.users) ? it.users.slice() : [],
            })),
          };

    saveExpenses(roomId, [expense, ...prev]);
    navigate(`/rooms/${roomId}`);
  };

  // ---------------------------
  // OCR 연동 (스키마 미정 대응)
  // ---------------------------
  const [ocrState, setOcrState] = useState("IDLE"); // IDLE | UPLOADING | PROCESSING | DONE | FAILED
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrExpenseId, setOcrExpenseId] = useState(null);

  async function createExpenseDraftOnServer() {
    // ⚠️ 최소 request body는 백엔드 명세 확인 필요
    const resJson = await apiFetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        title: "영수증 분석 중",
        // dateKey 형태가 필요할 수도 있어 안전하게 둘 다 넣어둠
        date: new Date().toISOString(),
        dateKey: toDateKey(new Date()),
      }),
    });

    const id = extractExpenseId(resJson);
    if (!id) throw new Error("expenseId를 응답에서 찾지 못했습니다.");
    return id;
  }

  async function uploadReceiptToServer(expenseId, file) {
    const form = new FormData();
    // ⚠️ field name이 image/file 중 무엇인지 미정이라 둘 다 넣는 방식(서버가 하나만 받으면 무시될 수 있음)
    form.append("image", file);
    form.append("file", file);

    await apiFetch(`/api/groups/${groupId}/${expenseId}/img`, {
      method: "POST",
      headers: authHeaders(), // multipart는 Content-Type 직접 지정 X
      body: form,
    });
  }

  async function pollOcrStatus(expenseId) {
    // 상태값 enum 미정 → 문자열 포함으로 방어
    const maxTry = 40; // 80초 정도
    for (let i = 0; i < maxTry; i++) {
      const resJson = await apiFetch(`/api/expenses/${expenseId}/status`, {
        headers: authHeaders(),
      });

      const d = resJson?.data ?? resJson ?? {};
      const status = String(
        d.status || d.state || d.result || "",
      ).toUpperCase();

      if (
        status.includes("DONE") ||
        status.includes("COMPLETE") ||
        status.includes("SUCCESS")
      ) {
        return true;
      }
      if (status.includes("FAIL") || status.includes("ERROR")) {
        throw new Error("OCR 분석 실패");
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("OCR 분석 시간이 너무 오래 걸립니다.");
  }

  async function fetchOcrAnalysis(expenseId) {
    const resJson = await apiFetch(`/api/expenses/${expenseId}/analysis`, {
      headers: authHeaders(),
    });
    return normalizeOcrAnalysis(resJson);
  }

  async function handleReceiptFile(file) {
    setOcrMsg("");
    setOcrState("UPLOADING");

    try {
      const expenseId = await createExpenseDraftOnServer();
      setOcrExpenseId(expenseId);

      setOcrMsg("영수증 업로드 중…");
      await uploadReceiptToServer(expenseId, file);

      setOcrState("PROCESSING");
      setOcrMsg("영수증 분석 중… (잠시만)");

      await pollOcrStatus(expenseId);

      const {
        title: oTitle,
        dateKey,
        total,
        items: oItems,
      } = await fetchOcrAnalysis(expenseId);

      // 폼 자동 채우기
      if (oTitle) setTitle(oTitle);
      if (dateKey) setDate(dateKey);

      setSplitType(SPLIT.ITEM);

      // items가 있으면 품목으로, 없으면 합계 1줄로
      if (oItems && oItems.length > 0) {
        setItems(
          oItems.map((it) => ({
            id: String(Date.now()) + Math.random().toString(16).slice(2),
            name: it.name || "",
            // 기본은 TOTAL_SPLIT(총액)으로 넣고, 사용자가 PER_PERSON로 바꾸게
            split: ITEM_SPLIT.TOTAL_SPLIT,
            amount: String(it.amount || 0),
            pricePerPerson: "",
            users: members.slice(), // 일단 전체 선택
          })),
        );
      } else if (total > 0) {
        setItems([
          {
            id: String(Date.now()),
            name: "영수증 합계",
            split: ITEM_SPLIT.TOTAL_SPLIT,
            amount: String(total),
            pricePerPerson: "",
            users: members.slice(),
          },
        ]);
      }

      setOcrState("DONE");
      setOcrMsg("분석 완료! 내용을 확인하고 저장해 주세요.");
    } catch (err) {
      setOcrState("FAILED");
      setOcrMsg(err?.message || "OCR 처리 중 오류가 발생했습니다.");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>지출 등록</h2>

      {/* ✅ OCR 업로드 블록 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "white",
          maxWidth: 760,
          marginBottom: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>영수증으로 자동 입력</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          사진을 올리면 제목/날짜/품목/금액을 자동으로 채웁니다. (이후 반드시
          확인/수정)
        </div>

        <input
          type="file"
          accept="image/*"
          disabled={ocrState === "UPLOADING" || ocrState === "PROCESSING"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReceiptFile(f);
            e.target.value = ""; // 같은 파일 다시 선택 가능
          }}
        />

        {(ocrState === "UPLOADING" || ocrState === "PROCESSING") && (
          <div style={{ fontSize: 13, color: "#1976d2", fontWeight: 700 }}>
            {ocrMsg || "처리 중…"}
          </div>
        )}

        {ocrState === "DONE" && (
          <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 800 }}>
            {ocrMsg}
            {ocrExpenseId ? (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                (서버 expenseId: {ocrExpenseId})
              </div>
            ) : null}
          </div>
        )}

        {ocrState === "FAILED" && (
          <div style={{ fontSize: 13, color: "#b91c1c", fontWeight: 800 }}>
            {ocrMsg}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setOcrState("IDLE");
                  setOcrMsg("");
                  setOcrExpenseId(null);
                }}
              >
                확인(수동 입력)
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
        <label style={{ fontWeight: 800 }}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 카페, 숙소, 택시"
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <div
          style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}
        >
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
        </div>

        {/* 분배 방식 */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900 }}>분배 방식</div>

          <div
            style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                checked={splitType === SPLIT.EQUAL}
                onChange={() => setSplitType(SPLIT.EQUAL)}
              />
              지출 전체 n빵
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="radio"
                checked={splitType === SPLIT.ITEM}
                onChange={() => setSplitType(SPLIT.ITEM)}
              />
              품목 혼합(품목별 + 품목 n빵)
            </label>
          </div>
        </div>

        {/* 지출 전체 n빵 UI */}
        {splitType === SPLIT.EQUAL && (
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              background: "white",
              display: "grid",
              gap: 10,
            }}
          >
            <label style={{ fontWeight: 800 }}>
              총 금액
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="예) 300000"
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

            <div style={{ fontWeight: 800 }}>참여자</div>
            <div
              style={{
                display: "grid",
                gap: 8,
                border: "1px solid #f3f4f6",
                borderRadius: 12,
                padding: 12,
                background: "white",
              }}
            >
              {members.map((m) => (
                <label
                  key={m}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
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
          </div>
        )}

        {/* 품목 혼합 UI */}
        {splitType === SPLIT.ITEM && (
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
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>품목</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  품목별(1인당) / 품목 n빵(총액) 둘 다 가능
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>총 합계</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {totalItemsAmount.toLocaleString()}원
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {items.map((it, idx) => {
                const usersCnt = Array.isArray(it.users) ? it.users.length : 0;
                const split = it.split || ITEM_SPLIT.PER_PERSON;

                const perPerson = Number(it.pricePerPerson) || 0;
                const total = Number(it.amount) || 0;

                const itemTotal =
                  split === ITEM_SPLIT.TOTAL_SPLIT
                    ? total
                    : perPerson * usersCnt;

                const hint =
                  split === ITEM_SPLIT.TOTAL_SPLIT
                    ? `품목 총액 ${total.toLocaleString()}원 ÷ ${usersCnt}명`
                    : `1인당 ${perPerson.toLocaleString()}원 × ${usersCnt}명`;

                return (
                  <div
                    key={it.id}
                    style={{
                      border: "1px solid #f3f4f6",
                      borderRadius: 12,
                      padding: 12,
                      background: "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>품목 {idx + 1}</div>
                      <button
                        onClick={() => removeItem(it.id)}
                        disabled={items.length <= 1}
                      >
                        삭제
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <label style={{ fontWeight: 800 }}>
                        품목명
                        <input
                          value={it.name}
                          onChange={(e) =>
                            updateItem(it.id, { name: e.target.value })
                          }
                          placeholder="예) 아메리카노, 라떼, 케이크"
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 10,
                            border: "1px solid #ddd",
                          }}
                        />
                      </label>

                      <div
                        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                      >
                        <label
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="radio"
                            checked={split === ITEM_SPLIT.PER_PERSON}
                            onChange={() =>
                              updateItem(it.id, {
                                split: ITEM_SPLIT.PER_PERSON,
                              })
                            }
                          />
                          품목별(1인당)
                        </label>
                        <label
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="radio"
                            checked={split === ITEM_SPLIT.TOTAL_SPLIT}
                            onChange={() =>
                              updateItem(it.id, {
                                split: ITEM_SPLIT.TOTAL_SPLIT,
                              })
                            }
                          />
                          품목 n빵(총액)
                        </label>
                      </div>

                      {split === ITEM_SPLIT.PER_PERSON ? (
                        <label style={{ fontWeight: 800 }}>
                          1인당 가격
                          <input
                            value={it.pricePerPerson}
                            onChange={(e) =>
                              updateItem(it.id, {
                                pricePerPerson: e.target.value,
                              })
                            }
                            placeholder="예) 4500"
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
                      ) : (
                        <label style={{ fontWeight: 800 }}>
                          품목 총액
                          <input
                            value={it.amount}
                            onChange={(e) =>
                              updateItem(it.id, { amount: e.target.value })
                            }
                            placeholder="예) 10000"
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
                      )}

                      <div style={{ fontWeight: 800 }}>먹은 사람</div>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          border: "1px solid #f3f4f6",
                          borderRadius: 12,
                          padding: 12,
                          background: "white",
                        }}
                      >
                        {members.map((m) => (
                          <label
                            key={m}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                Array.isArray(it.users) && it.users.includes(m)
                              }
                              onChange={() => toggleItemUser(it.id, m)}
                            />
                            <span>{m}</span>
                          </label>
                        ))}
                      </div>

                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        품목 합계: <b>{itemTotal.toLocaleString()}원</b> ({hint}
                        )
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={addItem}>+ 품목 추가</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => navigate(-1)}>취소</button>
          <button onClick={handleSave} disabled={!canSave}>
            저장
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#777" }}>
          * 지금은 localStorage 저장입니다. 서버 연동 시 저장 로직을 API로
          바꾸면 됩니다.
        </div>
      </div>
    </div>
  );
}
