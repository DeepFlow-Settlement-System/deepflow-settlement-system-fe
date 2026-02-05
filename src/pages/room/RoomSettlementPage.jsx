import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXPENSES_KEY_V2 = (roomId) => `expenses_v2_${roomId}`;
const EXPENSES_KEY_V1 = (roomId) => `expenses_v1_${roomId}`;
const ME_KEY = "user_name_v1";

// ✅ 설정과 동일 키 사용
const KAKAO_TRANSFER_VALUE_KEY = "kakao_transfer_value_v1";

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
      return { from, to, amount: Math.round(amount) };
    })
    .sort((a, b) => b.amount - a.amount);
}

function loadTransferValue() {
  return localStorage.getItem(KAKAO_TRANSFER_VALUE_KEY) || "";
}

function saveTransferValue(v) {
  localStorage.setItem(KAKAO_TRANSFER_VALUE_KEY, v);
}

export default function RoomSettlementPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

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

  // ✅ 요청 보내기 UI
  const [notice, setNotice] = useState("");
  const toast = (msg) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [transferValueDraft, setTransferValueDraft] = useState(() =>
    loadTransferValue(),
  );

  const ensureTransferValue = () => {
    const v = loadTransferValue();
    if (v) return true;
    setTransferValueDraft("");
    setOpenTransferDialog(true);
    return false;
  };

  const buildRequestMessage = (from, amount) => {
    const v = loadTransferValue();
    // MVP: 링크/코드 문자열을 그대로 안내 메시지에 포함
    return `정산 요청입니다!\n\n보낼 사람: ${from}\n받는 사람: ${me}\n금액: ${Number(amount).toLocaleString()}원\n\n송금 링크/코드:\n${v}\n\n(앱: Trip Split)`;
  };

  const copyRequestFor = async (from, amount) => {
    if (!ensureTransferValue()) return;

    const msg = buildRequestMessage(from, amount);
    try {
      await navigator.clipboard.writeText(msg);
      toast("요청 메시지 복사됨");
    } catch {
      window.prompt("아래 메시지를 복사해서 카톡으로 보내세요:", msg);
    }
  };

  const saveTransferFromDialog = () => {
    const next = transferValueDraft.trim();

    if (!next) {
      toast("송금 링크/코드를 입력해 주세요");
      return;
    }
    if (next.length < 6) {
      toast("값이 너무 짧아요. 다시 확인해 주세요.");
      return;
    }
    if (/\s/.test(next)) {
      toast("공백이 포함되어 있어요. 공백을 제거해 주세요.");
      return;
    }

    saveTransferValue(next);
    setOpenTransferDialog(false);
    toast("송금 링크/코드 저장됨");
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">정산</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            기준 사용자: <b className="text-foreground">{me}</b>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">내 기준 요약</div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <div>
                보낼 금액: <b>{summary.send.toLocaleString()}원</b>
              </div>
              <div>
                받을 금액: <b>{summary.recv.toLocaleString()}원</b>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                />
                전체 송금표도 보기
              </label>

              <Button
                variant="outline"
                onClick={() => {
                  // 설정으로 바로 이동할 수도 있게
                  navigate(`/rooms/${roomId}/settings`);
                }}
              >
                내 송금 링크/코드 설정
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              저장된 송금 값:{" "}
              <span className="font-mono break-all">
                {loadTransferValue() || "(없음) - 요청 보내기 시 입력 필요"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">송금표</CardTitle>
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              정산할 내역이 없습니다. (지출/품목/참여자 데이터를 확인해주세요)
            </div>
          ) : (
            <div className="grid gap-3">
              {shown.map((t, idx) => {
                const hint =
                  t.from === me
                    ? "내가 보내야 함"
                    : t.to === me
                      ? "내가 받아야 함"
                      : "전체 송금표";

                const canRequest = t.to === me && t.amount > 0; // ✅ 내가 받을 건만 요청 생성

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        <b>{t.from}</b> → <b>{t.to}</b>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {hint}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold">
                        {t.amount.toLocaleString()}원
                      </div>

                      {canRequest && (
                        <Button
                          size="sm"
                          onClick={() => copyRequestFor(t.from, t.amount)}
                        >
                          요청 메시지 복사
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ 모달: 송금 링크/코드 입력 */}
      <Dialog open={openTransferDialog} onOpenChange={setOpenTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>송금 링크/코드 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              정산 요청 메시지에 포함할 송금 링크/코드를 붙여넣어 주세요. (한 번
              저장하면 다음부터는 자동 사용됩니다.)
            </p>

            <div className="grid gap-2">
              <Label>송금 링크 또는 코드</Label>
              <Input
                value={transferValueDraft}
                onChange={(e) => setTransferValueDraft(e.target.value)}
                placeholder="카카오톡에서 복사한 값을 붙여넣기"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenTransferDialog(false)}
              >
                취소
              </Button>
              <Button onClick={saveTransferFromDialog}>저장</Button>
            </div>

            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                왜 이게 필요하죠?
              </summary>
              <div className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>
                  카카오 송금은 받는 사람 식별 정보가 포함된 링크/코드가
                  필요합니다. 지금은 카카오 API 미연동 상태라 앱이 자동으로 알
                  수 없어, 한 번만 입력받아 저장합니다.
                </p>
              </div>
            </details>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
