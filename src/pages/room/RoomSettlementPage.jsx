// src/pages/room/RoomSettlementPage.jsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { SETTLEMENT_STATUS } from "@/constants/settlement";
import TransferRow from "@/components/TransferRow";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const EXPENSES_KEY_V2 = (roomId) => `expenses_v2_${roomId}`;
const EXPENSES_KEY_V1 = (roomId) => `expenses_v1_${roomId}`;
const ME_KEY = "user_name_v1";

// ✅ room별 상태 저장
const STATUS_KEY = (roomId) => `settlement_status_v1_${roomId}`;

// 혼합정산 item mode
const ITEM_MODE = {
  PER_PERSON: "PER_PERSON",
  SHARED_SPLIT: "SHARED_SPLIT",
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

function loadExpenses(roomId) {
  const raw2 = localStorage.getItem(EXPENSES_KEY_V2(roomId));
  const raw1 = localStorage.getItem(EXPENSES_KEY_V1(roomId));
  const a2 = raw2 ? safeParseArray(raw2) : [];
  const a1 = raw1 ? safeParseArray(raw1) : [];
  return [...a2, ...a1];
}

function loadStatusMap(roomId) {
  try {
    const raw = localStorage.getItem(STATUS_KEY(roomId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStatusMap(roomId, map) {
  localStorage.setItem(STATUS_KEY(roomId), JSON.stringify(map));
}

function addTransfer(map, from, to, amount) {
  if (!from || !to) return;
  if (from === to) return;
  const key = `${from}->${to}`;
  map.set(key, (map.get(key) || 0) + amount);
}

function computeTransfers(expenses) {
  const transfers = new Map();

  for (const e of expenses) {
    const payer = e.payerName || e.payer || "미정";
    const items = Array.isArray(e.items) ? e.items : [];

    // ✅ v2(혼합정산): items 기반 계산
    if (items.length > 0) {
      for (const it of items) {
        const users = Array.isArray(it.users) ? it.users : [];
        if (users.length === 0) continue;

        if (it.mode === ITEM_MODE.SHARED_SPLIT) {
          const total = Number(it.totalPrice) || 0;
          const share = users.length > 0 ? total / users.length : 0;
          for (const u of users) {
            if (u !== payer)
              addTransfer(transfers, u, payer, Math.round(share));
          }
        } else {
          const unit = Number(it.unitPrice) || 0;
          for (const u of users) {
            if (u !== payer) addTransfer(transfers, u, payer, unit);
          }
        }
      }
      continue;
    }

    // ✅ fallback(v1): amount + participants로 n빵
    const total = Number(e.amount) || 0;
    const participants =
      Array.isArray(e.participants) && e.participants.length > 0
        ? e.participants
        : [payer];

    const share = participants.length > 0 ? total / participants.length : 0;
    for (const u of participants) {
      if (u !== payer) addTransfer(transfers, u, payer, Math.round(share));
    }
  }

  return Array.from(transfers.entries())
    .map(([key, amount]) => {
      const [from, to] = key.split("->");
      return { id: key, from, to, amount: Math.round(amount) };
    })
    .sort((a, b) => b.amount - a.amount);
}

export default function RoomSettlementPage() {
  const { roomId } = useParams();
  const me = loadMe();

  const expenses = useMemo(() => loadExpenses(roomId), [roomId]);
  const baseTransfers = useMemo(() => computeTransfers(expenses), [expenses]);

  // ✅ 상태 맵
  const [statusMap, setStatusMap] = useState(() => loadStatusMap(roomId));
  const persistStatusMap = (next) => {
    setStatusMap(next);
    saveStatusMap(roomId, next);
  };

  // ✅ status 주입
  const transfers = useMemo(() => {
    return baseTransfers.map((t) => ({
      ...t,
      status: statusMap[t.id] || SETTLEMENT_STATUS.READY,
    }));
  }, [baseTransfers, statusMap]);

  // 내가 관련된 것만 보기 / 전체 보기
  const [showAll, setShowAll] = useState(false);
  const myTransfers = useMemo(
    () => transfers.filter((t) => t.from === me || t.to === me),
    [transfers, me],
  );
  const shown = showAll ? transfers : myTransfers;

  // ✅ "요청 가능한 것" = 내가 받을 돈(to === me) 이고 READY인 것
  const requestables = useMemo(() => {
    return transfers.filter(
      (t) => t.to === me && t.status === SETTLEMENT_STATUS.READY,
    );
  }, [transfers, me]);

  // 내 기준 요약
  const summary = useMemo(() => {
    let send = 0;
    let recv = 0;
    for (const t of myTransfers) {
      if (t.from === me) send += t.amount;
      if (t.to === me) recv += t.amount;
    }
    return { send, recv };
  }, [myTransfers, me]);

  // ✅ 전체 요청 팝업
  const [openBulk, setOpenBulk] = useState(false);

  // actions
  const markRequested = (ids) => {
    const next = { ...statusMap };
    for (const id of ids) next[id] = SETTLEMENT_STATUS.REQUESTED;
    persistStatusMap(next);
  };

  const markDone = (id) => {
    const next = { ...statusMap, [id]: SETTLEMENT_STATUS.DONE };
    persistStatusMap(next);
  };

  const onRequestOne = (id) => {
    markRequested([id]);
    // 지금은 더미 처리(나중에 API 붙이면 여기서 호출)
    // alert("정산 요청을 보냈어요! (더미)");
  };

  const onResendOne = (id) => {
    // 상태는 REQUESTED 유지
    const next = { ...statusMap, [id]: SETTLEMENT_STATUS.REQUESTED };
    persistStatusMap(next);
    // alert("정산 요청을 재전송했어요! (더미)");
  };

  const onDoneOne = (id) => {
    markDone(id);
  };

  const onBulkOpen = () => setOpenBulk(true);

  const onBulkConfirm = () => {
    if (requestables.length === 0) return;
    markRequested(requestables.map((t) => t.id));
    setOpenBulk(false);
    // alert("정산 요청을 한 번에 보냈어요! (더미)");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold m-0">정산</h2>

        {/* ✅ 한 번에 요청 보내기 버튼 */}
        <Button onClick={onBulkOpen} disabled={requestables.length === 0}>
          한 번에(전부) 요청 보내기
        </Button>
      </div>

      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">
          기준 사용자: <b className="text-foreground">{me}</b>
        </div>

        <div className="flex gap-4 flex-wrap text-sm">
          <div>
            보낼 금액: <b>{summary.send.toLocaleString()}원</b>
          </div>
          <div>
            받을 금액: <b>{summary.recv.toLocaleString()}원</b>
          </div>
        </div>

        <Separator className="my-2" />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          전체 송금표도 보기
        </label>

        <div className="text-xs text-muted-foreground">
          * “완료”는 자동 처리되지 않습니다. 실제 송금 확인 후 “완료”를
          눌러주세요.
        </div>
      </Card>

      {/* 리스트 */}
      {shown.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          정산할 내역이 없습니다. (지출/참여자 데이터를 확인해주세요)
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((t) => {
            // ✅ 내가 받을 돈일 때만 요청/재전송/완료 버튼 노출
            const canRequest = t.to === me;

            return (
              <TransferRow
                key={t.id}
                item={t}
                canRequest={canRequest}
                onRequest={onRequestOne}
                onResend={onResendOne}
                onDone={onDoneOne}
              />
            );
          })}
        </div>
      )}

      {/* ✅ 전체 요청 팝업 */}
      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정산 요청을 한 번에 보낼까요?</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground">
            아래 사람들에게 정산 요청을 보냅니다.
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-sm font-semibold">요청 받는 사람</div>

            {requestables.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                요청할 항목이 없습니다.
              </div>
            ) : (
              <div className="grid gap-2">
                {requestables.map((t) => (
                  <Card
                    key={t.id}
                    className="p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <b>{t.from}</b> (나에게 보내야 함)
                    </div>
                    <div className="text-sm font-semibold">
                      {t.amount.toLocaleString()}원
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setOpenBulk(false)}>
              취소
            </Button>
            <Button
              onClick={onBulkConfirm}
              disabled={requestables.length === 0}
            >
              요청 보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
