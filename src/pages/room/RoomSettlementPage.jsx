// src/pages/room/RoomSettlementPage.jsx
import { useEffect, useMemo, useState } from "react";
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
import { getExpenses } from "@/api/expenses";
import { getMe } from "@/api/users";
import { getGroupDetail } from "@/api/groups";

// ✅ room별 상태 저장
const STATUS_KEY = (roomId) => `settlement_status_v1_${roomId}`;

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

function computeTransfers(expenses, userIdToNameMap) {
  const transfers = new Map();

  for (const e of expenses) {
    const payerUserId = e.payerUserId || e.payer?.userId || e.payer;
    const payerName =
      userIdToNameMap[payerUserId] || `사용자 ${payerUserId}` || "미정";

    // API 응답 형식: settlementType이 "ITEMIZED"면 items 사용, "N_BBANG"이면 participants 사용
    if (e.settlementType === "ITEMIZED" && Array.isArray(e.items)) {
      // 품목별 정산
      for (const it of e.items) {
        const itemParticipants = Array.isArray(it.participants)
          ? it.participants
          : [];
        if (itemParticipants.length === 0) continue;

        const itemTotal = Number(it.totalPrice || it.price || 0);
        const share =
          itemParticipants.length > 0
            ? Math.round(itemTotal / itemParticipants.length)
            : 0;

        for (const p of itemParticipants) {
          const participantUserId = p.userId || p;
          if (participantUserId === payerUserId) continue;
          const participantName =
            userIdToNameMap[participantUserId] || `사용자 ${participantUserId}`;
          addTransfer(transfers, participantUserId, payerUserId, share);
        }
      }
    } else {
      // N빵 정산
      const total = Number(e.totalAmount || e.amount || 0);
      const participants = Array.isArray(e.participants)
        ? e.participants
        : payerUserId
          ? [{ userId: payerUserId }]
          : [];

      if (participants.length === 0) continue;

      const share = Math.round(total / participants.length);

      for (const p of participants) {
        const participantUserId = p.userId || p;
        if (participantUserId === payerUserId) continue;
        const participantName =
          userIdToNameMap[participantUserId] || `사용자 ${participantUserId}`;
        addTransfer(transfers, participantUserId, payerUserId, share);
      }
    }
  }

  return Array.from(transfers.entries())
    .map(([key, amount]) => {
      const [from, to] = key.split("->");
      const fromName = userIdToNameMap[from] || `사용자 ${from}`;
      const toName = userIdToNameMap[to] || `사용자 ${to}`;
      return {
        id: key,
        from: from,
        to: to,
        fromName,
        toName,
        amount: Math.round(amount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export default function RoomSettlementPage() {
  const { roomId } = useParams();

  const [expenses, setExpenses] = useState([]);
  const [group, setGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [expensesData, groupData, userData] = await Promise.all([
          getExpenses(Number(roomId)),
          getGroupDetail(Number(roomId)).catch(() => null),
          getMe().catch(() => null),
        ]);
        setExpenses(expensesData?.expenses || []);
        setGroup(groupData);
        setCurrentUser(userData);
      } catch (e) {
        console.error("데이터 조회 실패:", e);
        setError(e?.message || "데이터를 불러오는데 실패했습니다.");
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // 사용자 ID -> 이름 매핑 생성
  const userIdToNameMap = useMemo(() => {
    const map = {};
    if (group?.members) {
      for (const member of group.members) {
        const userId = member.userId || member.id;
        const name =
          member.nickname ||
          member.user?.nickname ||
          member.name ||
          member.user?.name ||
          member.username ||
          member.user?.username ||
          `사용자 ${userId}`;
        map[userId] = name;
      }
    }
    if (currentUser) {
      const userId = currentUser.id || currentUser.userId;
      const name =
        currentUser.nickname ||
        currentUser.name ||
        currentUser.username ||
        `사용자 ${userId}`;
      map[userId] = name;
    }
    return map;
  }, [group, currentUser]);

  const currentUserId = currentUser?.id || currentUser?.userId;

  const baseTransfers = useMemo(
    () => computeTransfers(expenses, userIdToNameMap),
    [expenses, userIdToNameMap],
  );

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
      status: statusMap[t.id] || SETTLEMENT_STATUS.UNSETTLED,
    }));
  }, [baseTransfers, statusMap]);

  // 내가 관련된 것만 보기 / 전체 보기
  const [showAll, setShowAll] = useState(false);
  const myTransfers = useMemo(
    () =>
      transfers.filter(
        (t) => t.from === currentUserId || t.to === currentUserId,
      ),
    [transfers, currentUserId],
  );
  const shown = showAll ? transfers : myTransfers;

  // ✅ "요청 가능한 것" = 내가 받을 돈(to === currentUserId) 이고 UNSETTLED인 것
  const requestables = useMemo(() => {
    return transfers.filter(
      (t) => t.to === currentUserId && t.status === SETTLEMENT_STATUS.UNSETTLED,
    );
  }, [transfers, currentUserId]);

  // 내 기준 요약
  const summary = useMemo(() => {
    let send = 0;
    let recv = 0;
    for (const t of myTransfers) {
      if (t.from === currentUserId) send += t.amount;
      if (t.to === currentUserId) recv += t.amount;
    }
    return { send, recv };
  }, [myTransfers, currentUserId]);

  // ✅ 전체 요청 팝업
  const [openBulk, setOpenBulk] = useState(false);

  // actions
  const markRequested = (ids) => {
    const next = { ...statusMap };
    for (const id of ids) next[id] = SETTLEMENT_STATUS.REQUESTED;
    persistStatusMap(next);
  };

  const markDone = (id) => {
    const next = { ...statusMap, [id]: SETTLEMENT_STATUS.COMPLETED };
    persistStatusMap(next);
  };

  const onRequestOne = (id) => {
    markRequested([id]);
  };

  const onResendOne = (id) => {
    const next = { ...statusMap, [id]: SETTLEMENT_STATUS.REQUESTED };
    persistStatusMap(next);
  };

  const onDoneOne = (id) => {
    markDone(id);
  };

  const onBulkOpen = () => setOpenBulk(true);

  const onBulkConfirm = () => {
    if (requestables.length === 0) return;
    markRequested(requestables.map((t) => t.id));
    setOpenBulk(false);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  const currentUserName =
    currentUser?.nickname ||
    currentUser?.name ||
    currentUser?.username ||
    userIdToNameMap[currentUserId] ||
    "사용자";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold m-0">정산</h2>

        <Button onClick={onBulkOpen} disabled={requestables.length === 0}>
          한 번에(전부) 요청 보내기
        </Button>
      </div>

      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">
          기준 사용자: <b className="text-foreground">{currentUserName}</b>
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

      {shown.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          정산할 내역이 없습니다. (지출/참여자 데이터를 확인해주세요)
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((t) => {
            const canRequest = t.to === currentUserId;
            const displayItem = {
              ...t,
              from: t.fromName || `사용자 ${t.from}`,
              to: t.toName || `사용자 ${t.to}`,
            };

            return (
              <TransferRow
                key={t.id}
                item={displayItem}
                canRequest={canRequest}
                onRequest={onRequestOne}
                onResend={onResendOne}
                onDone={onDoneOne}
              />
            );
          })}
        </div>
      )}

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
                      <b>{t.fromName || `사용자 ${t.from}`}</b> (나에게 보내야
                      함)
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
