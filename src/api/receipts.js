// src/api/receipts.js
import { apiFetch } from "@/api/client";

// POST /api/receipts (multipart/form-data)
export async function uploadReceiptImage(file) {
  const fd = new FormData();
  fd.append("image", file); // ✅ swagger 기준 필드명 image

  const res = await apiFetch("/api/receipts", {
    method: "POST",
    body: fd,
    // ❗headers에 Content-Type 넣지 말기 (boundary 깨짐)
  });

  return res?.receiptId ?? res?.data?.receiptId ?? null;
}

export async function getReceiptOcrStatus(receiptId) {
  return apiFetch(`/api/receipts/${receiptId}/status`, { method: "GET" });
}

export async function getReceiptOcrAnalysis(receiptId) {
  return apiFetch(`/api/receipts/${receiptId}/analysis`, { method: "GET" });
}

// 최대 maxTries번 상태 조회 → SUCCESS면 analysis 가져옴
export async function pollReceiptOcr(
  receiptId,
  { intervalMs = 1000, maxTries = 25 } = {},
) {
  for (let i = 0; i < maxTries; i++) {
    const st = await getReceiptOcrStatus(receiptId);

    const status = st?.ocrStatus ?? st?.data?.ocrStatus ?? null;

    if (status === "SUCCESS") {
      const analysis = await getReceiptOcrAnalysis(receiptId);
      return { status, analysis };
    }

    if (status === "FAILED") {
      return { status, analysis: null };
    }

    // PENDING 등
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { status: "TIMEOUT", analysis: null };
}
