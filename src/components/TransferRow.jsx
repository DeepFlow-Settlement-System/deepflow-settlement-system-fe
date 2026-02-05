// src/components/TransferRow.jsx
import { SETTLEMENT_STATUS } from "@/constants/settlement";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TransferRow({
  item,
  canRequest = false, // "내가 받을 돈"인 경우만 true로 내려줄 것
  onRequest,
  onResend,
  onDone,
}) {
  const isReady = item.status === SETTLEMENT_STATUS.READY;
  const isRequested = item.status === SETTLEMENT_STATUS.REQUESTED;
  const isDone = item.status === SETTLEMENT_STATUS.DONE;

  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">
          {item.from} → {item.to}
        </div>

        <div className="text-sm text-muted-foreground mt-1">
          {Number(item.amount || 0).toLocaleString()}원
        </div>

        <div className="mt-2 text-xs">
          {isReady && <span className="text-muted-foreground">요청 전</span>}
          {isRequested && (
            <Badge variant="secondary" className="font-semibold">
              요청됨
            </Badge>
          )}
          {isDone && <Badge className="font-semibold">완료됨</Badge>}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {/* ✅ "요청"은 요청 전 + 요청 가능할 때만 */}
        {canRequest && isReady && (
          <Button onClick={() => onRequest(item.id)}>요청</Button>
        )}

        {/* ✅ 요청 후에는 "재전송/완료"만 */}
        {canRequest && isRequested && (
          <>
            <Button variant="outline" onClick={() => onResend(item.id)}>
              재전송
            </Button>
            <Button onClick={() => onDone(item.id)}>완료</Button>
          </>
        )}

        {/* ✅ 완료 후에는 고정 */}
        {isDone && <span className="text-lg">✅</span>}
      </div>
    </Card>
  );
}
