// src/api/receipts.js
import { apiFetch } from "./client";

/**
 * 영수증 업로드 및 OCR 실행
 * @param {File} image - 이미지 파일
 * @returns {Promise<Object>} {receiptId}
 */
export async function uploadReceipt(image) {
  const formData = new FormData();
  formData.append("image", image);

  return await apiFetch("/api/receipts", {
    method: "POST",
    body: formData,
  });
}

/**
 * 영수증 OCR 상태 조회
 * @param {number} receiptId - 영수증 ID
 * @returns {Promise<Object>} {ocrStatus: "PENDING" | "SUCCESS" | "FAILED"}
 */
export async function getOcrStatus(receiptId) {
  return await apiFetch(`/api/receipts/${receiptId}/status`);
}

/**
 * 영수증 OCR 결과 조회 (SUCCESS 상태일 때만)
 * @param {number} receiptId - 영수증 ID
 * @returns {Promise<Object>} OCR 결과 (ReceiptOcrResult JSON)
 */
export async function getOcrAnalysis(receiptId) {
  return await apiFetch(`/api/receipts/${receiptId}/analysis`);
}
