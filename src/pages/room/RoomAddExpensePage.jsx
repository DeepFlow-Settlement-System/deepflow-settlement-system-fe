import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXPENSES_KEY = (roomId) => `expenses_v2_${roomId}`;
const MEMBERS_KEY = (roomId) => `room_members_v1_${roomId}`;
const ME_KEY = "user_name_v1";

const SPLIT = {
  EQUAL: "EQUAL",
  ITEM: "ITEM", // 혼합정산
};

const ITEM_MODE = {
  PER_PERSON: "PER_PERSON",
  SHARED_SPLIT: "SHARED_SPLIT",
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

function newItem(members, patch = {}) {
  return {
    id: String(Date.now()) + Math.random().toString(16).slice(2),
    title: "",
    mode: ITEM_MODE.PER_PERSON,
    unitPrice: "",
    totalPrice: "",
    users: members.length ? [members[0]] : [],
    ...patch,
  };
}

/**
 * ✅ UI 개발용 더미 OCR 결과
 * 나중에 API 붙이면 여기만 교체하면 됨:
 *   const data = await ocrReceipt(file)
 */
async function fakeOcr(_file) {
  await new Promise((r) => setTimeout(r, 900));
  return {
    merchant: "카페(더미)",
    paidAt: new Date().toISOString(),
    total: 24500,
    items: [
      { name: "아메리카노", price: 4500, qty: 2 },
      { name: "라떼", price: 5000, qty: 2 },
      { name: "케이크", price: 10500, qty: 1 },
    ],
    rawText: "(더미 OCR 텍스트)",
  };
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
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [payerName, setPayerName] = useState(() => loadMe());

  const [splitType, setSplitType] = useState(SPLIT.ITEM);

  // 전체 n빵
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState(() => members);

  const toggleParticipant = (name) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  // 혼합정산(품목)
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

  const totalItemsAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const users = Array.isArray(it.users) ? it.users.length : 0;
      if (it.mode === ITEM_MODE.SHARED_SPLIT)
        return sum + (Number(it.totalPrice) || 0);
      return sum + (Number(it.unitPrice) || 0) * users;
    }, 0);
  }, [items]);

  const canSave = useMemo(() => {
    if (title.trim().length === 0) return false;

    if (splitType === SPLIT.EQUAL) {
      if (!(Number(amount) > 0)) return false;
      if (!participants || participants.length === 0) return false;
      return true;
    }

    if (!items || items.length === 0) return false;
    for (const it of items) {
      if ((it.title || "").trim().length === 0) return false;
      if (!Array.isArray(it.users) || it.users.length === 0) return false;

      if (it.mode === ITEM_MODE.SHARED_SPLIT) {
        if (!(Number(it.totalPrice) > 0)) return false;
      } else {
        if (!(Number(it.unitPrice) > 0)) return false;
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
              title: (it.title || "").trim(),
              mode: it.mode,
              unitPrice:
                it.mode === ITEM_MODE.PER_PERSON
                  ? Number(it.unitPrice) || 0
                  : undefined,
              totalPrice:
                it.mode === ITEM_MODE.SHARED_SPLIT
                  ? Number(it.totalPrice) || 0
                  : undefined,
              users: Array.isArray(it.users) ? it.users.slice() : [],
            })),
          };

    saveExpenses(roomId, [expense, ...prev]);
    navigate(`/rooms/${roomId}`);
  };

  // ---------- OCR UI only ----------
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [ocrStatus, setOcrStatus] = useState("IDLE"); // IDLE | RUNNING | DONE | ERROR
  const [ocrError, setOcrError] = useState("");

  const [ocrResult, setOcrResult] = useState(null); // {merchant, paidAt, total, items, rawText}

  const onPickReceipt = (file) => {
    if (!file) return;
    setReceiptFile(file);
    setReceiptUrl(URL.createObjectURL(file));
    setOcrStatus("IDLE");
    setOcrError("");
    setOcrResult(null);
  };

  const runOcr = async () => {
    if (!receiptFile) return;
    setOcrStatus("RUNNING");
    setOcrError("");
    try {
      // ✅ 나중에 API 붙이면 여기만 교체
      const data = await fakeOcr(receiptFile);
      setOcrResult(data);
      setOcrStatus("DONE");
    } catch (e) {
      setOcrStatus("ERROR");
      setOcrError(e?.message || "OCR 실패");
    }
  };

  const applyOcrToForm = () => {
    if (!ocrResult) return;

    // 제목/날짜/총액 자동 채움 (비어있을 때만)
    if (!title.trim()) {
      setTitle(
        ocrResult.merchant ? `${ocrResult.merchant} 영수증` : "영수증 지출",
      );
    }

    if (ocrResult.paidAt) {
      try {
        setDate(toDateKey(new Date(ocrResult.paidAt)));
      } catch {}
    }

    if (typeof ocrResult.total === "number" && ocrResult.total > 0) {
      setAmount(String(ocrResult.total));
    }

    const arr = Array.isArray(ocrResult.items) ? ocrResult.items : [];
    if (arr.length > 0) {
      setSplitType(SPLIT.ITEM);
      setItems((prev) => {
        const mapped = arr.slice(0, 15).map((it) =>
          newItem(members, {
            title: String(it.name || "").trim() || "품목",
            mode: ITEM_MODE.PER_PERSON,
            unitPrice: String(Number(it.price) || 0),
            users: members.slice(), // MVP: 일단 전원 체크 -> 사용자가 수정
          }),
        );

        const first = prev[0];
        const isFirstEmpty =
          prev.length === 1 &&
          !first?.title?.trim() &&
          !String(first?.unitPrice || "").trim() &&
          !String(first?.totalPrice || "").trim();

        return isFirstEmpty ? mapped : [...mapped, ...prev];
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* OCR UI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">영수증 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>영수증 이미지</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onPickReceipt(e.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground">
              지금은 UI만 준비해두고, 나중에 OCR API만 연결합니다.
            </p>
          </div>

          {receiptUrl && (
            <div className="grid gap-2">
              <div className="text-sm font-medium">미리보기</div>
              <img
                src={receiptUrl}
                alt="receipt preview"
                className="max-h-72 w-auto rounded-lg border"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={runOcr}
              disabled={!receiptFile || ocrStatus === "RUNNING"}
            >
              {ocrStatus === "RUNNING" ? "인식 중..." : "인식하기(OCR)"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReceiptFile(null);
                setReceiptUrl("");
                setOcrResult(null);
                setOcrStatus("IDLE");
                setOcrError("");
              }}
              disabled={ocrStatus === "RUNNING"}
            >
              초기화
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={applyOcrToForm}
              disabled={!ocrResult}
            >
              폼에 적용
            </Button>
          </div>

          {ocrStatus === "ERROR" && (
            <div className="text-sm text-destructive">
              인식 실패: {ocrError}
            </div>
          )}

          {ocrResult && (
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">인식 결과(미리보기)</div>
                <div className="text-sm text-muted-foreground">
                  가맹점:{" "}
                  <b className="text-foreground">{ocrResult.merchant || "-"}</b>{" "}
                  · 총액:{" "}
                  <b className="text-foreground">
                    {Number(ocrResult.total || 0).toLocaleString()}원
                  </b>
                </div>

                <div className="mt-2 grid gap-2">
                  {(ocrResult.items || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      품목을 찾지 못했어요. (나중에 API 연결 시 개선)
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {(ocrResult.items || []).slice(0, 10).map((it, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{it.name}</span>
                          <span className="text-muted-foreground">
                            {Number(it.price || 0).toLocaleString()}원
                            {it.qty ? ` × ${it.qty}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 기본 입력 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">지출 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 카페, 숙소, 택시"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>날짜</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>결제자</Label>
              <select
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={splitType === SPLIT.ITEM ? "default" : "outline"}
              onClick={() => setSplitType(SPLIT.ITEM)}
            >
              혼합정산(품목별 + 공동n빵)
            </Button>
            <Button
              type="button"
              variant={splitType === SPLIT.EQUAL ? "default" : "outline"}
              onClick={() => setSplitType(SPLIT.EQUAL)}
            >
              전체 n빵(기본)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 전체 n빵 */}
      {splitType === SPLIT.EQUAL && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">전체 n빵</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>총 금액</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2">
              <Label>참여자</Label>
              <div className="grid gap-2 rounded-lg border p-3">
                {members.map((m) => (
                  <label
                    key={m}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{m}</span>
                    <input
                      type="checkbox"
                      checked={participants.includes(m)}
                      onChange={() => toggleParticipant(m)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 혼합정산 */}
      {splitType === SPLIT.ITEM && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">품목(혼합)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                품목마다 <b>개별(1인당)</b> 또는 <b>공동(n빵)</b>을 선택하세요.
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">총 합계</div>
                <div className="text-lg font-bold">
                  {totalItemsAmount.toLocaleString()}원
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {items.map((it, idx) => {
                const cnt = Array.isArray(it.users) ? it.users.length : 0;
                const unit = Number(it.unitPrice) || 0;
                const total = Number(it.totalPrice) || 0;
                const lineTotal =
                  it.mode === ITEM_MODE.SHARED_SPLIT ? total : unit * cnt;

                return (
                  <Card key={it.id} className="border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">품목 {idx + 1}</div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeItem(it.id)}
                          disabled={items.length <= 1}
                        >
                          삭제
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        <Label>품목명</Label>
                        <Input
                          value={it.title}
                          onChange={(e) =>
                            updateItem(it.id, { title: e.target.value })
                          }
                          placeholder="예) 아메리카노 / 케이크"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={
                            it.mode === ITEM_MODE.PER_PERSON
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            updateItem(it.id, { mode: ITEM_MODE.PER_PERSON })
                          }
                        >
                          개별(1인당)
                        </Button>
                        <Button
                          type="button"
                          variant={
                            it.mode === ITEM_MODE.SHARED_SPLIT
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            updateItem(it.id, { mode: ITEM_MODE.SHARED_SPLIT })
                          }
                        >
                          공동(n빵)
                        </Button>
                      </div>

                      {it.mode === ITEM_MODE.PER_PERSON ? (
                        <div className="grid gap-2">
                          <Label>1인당 가격</Label>
                          <Input
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(it.id, { unitPrice: e.target.value })
                            }
                            inputMode="numeric"
                          />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Label>총액(참여자 n빵)</Label>
                          <Input
                            value={it.totalPrice}
                            onChange={(e) =>
                              updateItem(it.id, { totalPrice: e.target.value })
                            }
                            inputMode="numeric"
                          />
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label>참여자</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                          {members.map((m) => (
                            <label
                              key={m}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{m}</span>
                              <input
                                type="checkbox"
                                checked={
                                  Array.isArray(it.users) &&
                                  it.users.includes(m)
                                }
                                onChange={() => toggleItemUser(it.id, m)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        품목 합계: <b>{lineTotal.toLocaleString()}원</b>{" "}
                        {it.mode === ITEM_MODE.SHARED_SPLIT
                          ? `(총액 ${total.toLocaleString()}원 ÷ ${cnt || 0}명)`
                          : `(1인당 ${unit.toLocaleString()}원 × ${cnt}명)`}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button type="button" variant="outline" onClick={addItem}>
              + 품목 추가
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          취소
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          저장
        </Button>
      </div>
    </div>
  );
}
