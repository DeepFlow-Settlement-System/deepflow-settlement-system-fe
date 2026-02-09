// src/pages/room/RoomAddExpensePage.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense } from "@/api/expenses";
import { uploadReceipt, getOcrStatus, getOcrAnalysis } from "@/api/receipts";
import { getGroupDetail } from "@/api/groups";
import { getMe } from "@/api/users";

const SPLIT = {
  EQUAL: "EQUAL",
  ITEM: "ITEM", // 혼합정산
};

const ITEM_MODE = {
  PER_PERSON: "PER_PERSON",
  SHARED_SPLIT: "SHARED_SPLIT",
};

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function newItem(memberUserIds, patch = {}) {
  return {
    id: String(Date.now()) + Math.random().toString(16).slice(2),
    itemName: "",
    mode: ITEM_MODE.PER_PERSON,
    price: "",
    itemParticipants: memberUserIds.length
      ? [{ userId: memberUserIds[0] }]
      : [],
    ...patch,
  };
}

export default function RoomAddExpensePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [payerUserId, setPayerUserId] = useState(null);

  const [splitType, setSplitType] = useState(SPLIT.ITEM);

  // 사용자 정보 및 그룹 정보 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userData, groupData] = await Promise.all([
          getMe(),
          getGroupDetail(Number(roomId)),
        ]);

        const userId = userData?.id || userData?.userId || null;
        setCurrentUserId(userId);

        setGroup(groupData);
        // 멤버는 userId 배열로 변환
        const memberUserIds = (groupData.members || []).map((m) => m.userId);
        setMembers(memberUserIds);

        // payerUserId 설정: 현재 사용자 ID가 멤버에 있으면 그것을, 없으면 첫 번째 멤버
        if (userId && memberUserIds.includes(userId)) {
          setPayerUserId(userId);
        } else if (memberUserIds.length > 0) {
          setPayerUserId(memberUserIds[0]);
        }

        // participants 초기값 설정 (전체 멤버)
        setParticipants(memberUserIds);
      } catch (e) {
        console.error("데이터 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // 전체 1/N
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState([]);

  const toggleParticipant = (userId) => {
    setParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : [...prev, userId],
    );
  };

  // 혼합정산(품목)
  const [items, setItems] = useState(() => [newItem([])]);

  // members가 로드되면 items 초기화
  useEffect(() => {
    if (
      members.length > 0 &&
      items.length === 1 &&
      !items[0].itemName &&
      !items[0].price
    ) {
      setItems([newItem(members)]);
    }
  }, [members]);

  const addItem = () => setItems((prev) => [...prev, newItem(members)]);
  const removeItem = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const updateItem = (id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };

  const toggleItemUser = (itemId, userId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const participants = Array.isArray(it.itemParticipants)
          ? it.itemParticipants
          : [];
        const exists = participants.some((p) => p.userId === userId);
        const nextParticipants = exists
          ? participants.filter((p) => p.userId !== userId)
          : [...participants, { userId }];
        return { ...it, itemParticipants: nextParticipants };
      }),
    );
  };

  const totalItemsAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const participantCount = Array.isArray(it.itemParticipants)
        ? it.itemParticipants.length
        : 0;
      if (it.mode === ITEM_MODE.SHARED_SPLIT)
        return sum + (Number(it.price) || 0);
      return sum + (Number(it.price) || 0) * participantCount;
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
      if ((it.itemName || "").trim().length === 0) return false;
      if (
        !Array.isArray(it.itemParticipants) ||
        it.itemParticipants.length === 0
      )
        return false;
      if (!(Number(it.price) > 0)) return false;
    }
    return totalItemsAmount > 0;
  }, [title, splitType, amount, participants, items, totalItemsAmount]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [receiptId, setReceiptId] = useState(null);

  const handleSave = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      setSaveError("");

      // 날짜를 ISO 8601 형식으로 변환 (예: "2026-02-01T12:00:00")
      const dateTime = new Date(date);
      dateTime.setHours(12, 0, 0, 0);
      const spentAt = dateTime.toISOString().slice(0, 19);

      const expenseData = {
        title: title.trim(),
        spentAt,
        payerUserId,
        settlementType: splitType === SPLIT.EQUAL ? "N_BBANG" : "ITEMIZED",
        totalAmount: String(
          splitType === SPLIT.EQUAL ? Number(amount) : totalItemsAmount,
        ),
        participants: participants.map((userId) => ({ userId })),
        ...(splitType === SPLIT.ITEM && {
          items: items.map((it) => ({
            itemName: (it.itemName || "").trim(),
            price: String(Number(it.price) || 0),
            itemParticipants: Array.isArray(it.itemParticipants)
              ? it.itemParticipants
              : [],
          })),
        }),
        ...(receiptId && { receiptImageId: receiptId }),
      };

      await createExpense(Number(roomId), expenseData);
      navigate(`/rooms/${roomId}`);
    } catch (e) {
      console.error("지출 저장 실패:", e);
      setSaveError(e?.message || "지출 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
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
      // 1. 영수증 업로드
      const uploadRes = await uploadReceipt(receiptFile);
      const receiptIdValue = uploadRes.receiptId;
      setReceiptId(receiptIdValue);

      // 2. OCR 상태 확인 (폴링)
      let status = "PENDING";
      let attempts = 0;
      const maxAttempts = 30; // 최대 30초 대기

      while (status === "PENDING" && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
        const statusRes = await getOcrStatus(receiptIdValue);
        status = statusRes.ocrStatus;
        attempts++;

        if (status === "SUCCESS") {
          // 3. OCR 결과 조회
          const analysisRes = await getOcrAnalysis(receiptIdValue);
          // OCR 결과 파싱 (ReceiptOcrResult 형식에 맞게 변환 필요)
          setOcrResult(analysisRes);
          setOcrStatus("DONE");
          return;
        } else if (status === "FAILED") {
          throw new Error("OCR 처리에 실패했습니다.");
        }
      }

      if (status === "PENDING") {
        throw new Error("OCR 처리 시간이 초과되었습니다.");
      }
    } catch (e) {
      setOcrStatus("ERROR");
      setOcrError(e?.message || "OCR 실패");
    }
  };

  const applyOcrToForm = () => {
    if (!ocrResult) return;

    // OCR 결과 파싱 (ReceiptOcrResult 형식에 맞게 변환 필요)
    // TODO: 실제 OCR 결과 형식에 맞게 파싱 로직 구현
    // 일단 기본 구조만 유지
    try {
      const receiptData =
        typeof ocrResult === "string" ? JSON.parse(ocrResult) : ocrResult;
      const storeInfo = receiptData?.images?.[0]?.receipt?.result?.storeInfo;
      const items =
        receiptData?.images?.[0]?.receipt?.result?.subResults?.[0]?.items || [];
      const totalPrice =
        receiptData?.images?.[0]?.receipt?.result?.totalPrice?.price?.formatted;

      if (storeInfo?.name?.formatted?.value && !title.trim()) {
        setTitle(`${storeInfo.name.formatted.value} 영수증`);
      }

      if (totalPrice) {
        const total = Number(totalPrice.replace(/,/g, ""));
        if (total > 0) {
          setAmount(String(total));
        }
      }

      if (items.length > 0) {
        setSplitType(SPLIT.ITEM);
        setItems((prev) => {
          const mapped = items.slice(0, 15).map((it) =>
            newItem(members, {
              itemName:
                String(it.name?.formatted?.value || "").trim() || "품목",
              mode: ITEM_MODE.PER_PERSON,
              price: String(
                Number(it.price?.price?.formatted?.replace(/,/g, "") || 0),
              ),
              itemParticipants: members.map((userId) => ({ userId })),
            }),
          );

          const first = prev[0];
          const isFirstEmpty =
            prev.length === 1 &&
            !first?.itemName?.trim() &&
            !String(first?.price || "").trim();

          return isFirstEmpty ? mapped : [...mapped, ...prev];
        });
      }
    } catch (e) {
      console.error("OCR 결과 파싱 실패:", e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">
              그룹 정보를 불러오는 중...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {saveError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="text-sm text-destructive">{saveError}</div>
          </CardContent>
        </Card>
      )}

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
                value={payerUserId}
                onChange={(e) => setPayerUserId(Number(e.target.value))}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {members.map((userId) => (
                  <option key={userId} value={userId}>
                    사용자 {userId}
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
                {members.map((userId) => (
                  <label
                    key={userId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>사용자 {userId}</span>
                    <input
                      type="checkbox"
                      checked={participants.includes(userId)}
                      onChange={() => toggleParticipant(userId)}
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
                const cnt = Array.isArray(it.itemParticipants)
                  ? it.itemParticipants.length
                  : 0;
                const price = Number(it.price) || 0;
                const lineTotal =
                  it.mode === ITEM_MODE.SHARED_SPLIT ? price : price * cnt;

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
                          value={it.itemName}
                          onChange={(e) =>
                            updateItem(it.id, { itemName: e.target.value })
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

                      <div className="grid gap-2">
                        <Label>
                          {it.mode === ITEM_MODE.PER_PERSON
                            ? "1인당 가격"
                            : "총액(참여자 n빵)"}
                        </Label>
                        <Input
                          value={it.price}
                          onChange={(e) =>
                            updateItem(it.id, { price: e.target.value })
                          }
                          inputMode="numeric"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>참여자</Label>
                        <div className="grid gap-2 rounded-lg border p-3">
                          {members.map((userId) => (
                            <label
                              key={userId}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>사용자 {userId}</span>
                              <input
                                type="checkbox"
                                checked={
                                  Array.isArray(it.itemParticipants) &&
                                  it.itemParticipants.some(
                                    (p) => p.userId === userId,
                                  )
                                }
                                onChange={() => toggleItemUser(it.id, userId)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        품목 합계: <b>{lineTotal.toLocaleString()}원</b>{" "}
                        {it.mode === ITEM_MODE.SHARED_SPLIT
                          ? `(총액 ${price.toLocaleString()}원 ÷ ${cnt || 0}명)`
                          : `(1인당 ${price.toLocaleString()}원 × ${cnt}명)`}
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
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
