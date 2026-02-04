// src/components/TransferRow.jsx
import { SETTLEMENT_STATUS } from "../constants/settlement";

export default function TransferRow({ item, onRequest, onResend, onDone }) {
  const isReady = item.status === SETTLEMENT_STATUS.READY;
  const isRequested = item.status === SETTLEMENT_STATUS.REQUESTED;
  const isDone = item.status === SETTLEMENT_STATUS.DONE;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.from} → {item.to}
        </div>

        <div style={{ color: "#555", marginTop: 4 }}>
          {Number(item.amount || 0).toLocaleString()}원
        </div>

        <div style={{ marginTop: 6, fontSize: 12 }}>
          {isReady && <span style={{ color: "#777" }}>요청 전</span>}
          {isRequested && (
            <span style={{ color: "#1976d2", fontWeight: 800 }}>요청됨</span>
          )}
          {isDone && (
            <span style={{ color: "#2e7d32", fontWeight: 800 }}>완료됨</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {isReady && <button onClick={() => onRequest(item.id)}>요청</button>}

        {isRequested && (
          <>
            <button onClick={() => onResend(item.id)}>재전송</button>
            <button onClick={() => onDone(item.id)}>완료</button>
          </>
        )}

        {isDone && <span>✅</span>}
      </div>
    </div>
  );
}
