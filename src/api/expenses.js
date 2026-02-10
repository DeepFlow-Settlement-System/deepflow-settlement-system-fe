// src/api/expenses.js
import { apiFetch } from "./client";

/**
 * 그룹 지출 목록 조회
 * @param {number} groupId - 그룹 ID
 * @param {Object} [options] - 조회 옵션
 * @param {string} [options.startDate] - 조회 시작 날짜 (YYYY-MM-DD)
 * @param {string} [options.endDate] - 조회 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} {groupId, expenses: Array}
 */
export async function getExpenses(groupId, options = {}) {
  const params = new URLSearchParams();
  if (options.startDate) params.append("startDate", options.startDate);
  if (options.endDate) params.append("endDate", options.endDate);

  const queryString = params.toString();
  const url = `/api/groups/${groupId}/expenses${queryString ? `?${queryString}` : ""}`;

  const res = await apiFetch(url);
  console.log("getExpenses result:", res);
  return res || { groupId, expenses: [] };
}

/**
 * 지출 생성
 * @param {number} groupId - 그룹 ID
 * @param {Object} expenseData - 지출 데이터
 * @param {string} expenseData.title - 지출 제목/가게명
 * @param {string} expenseData.spentAt - 지출 날짜 (ISO 8601 형식, 예: "2026-02-01T12:00:00")
 * @param {number} expenseData.payerUserId - 결제자 사용자 ID
 * @param {string} expenseData.settlementType - 정산 타입 ("N_BBANG" 또는 "ITEMIZED")
 * @param {string} expenseData.totalAmount - 총 금액 (콤마 포함 가능, 예: "7,000")
 * @param {Array<{userId: number}>} expenseData.participants - 결제 참여자 목록
 * @param {number} [expenseData.receiptImageId] - 영수증 ID (선택)
 * @param {Array} [expenseData.items] - 품목 리스트 (ITEMIZED일 때 사용)
 * @returns {Promise<Object>} {expenseId}
 */
export async function createExpense(groupId, expenseData) {
  return await apiFetch(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
}

/**
 * 그룹 총 지출 조회
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<Object>} {groupId, totalAmount}
 */
export async function getGroupTotal(groupId) {
  return await apiFetch(`/api/expenses/${groupId}/total`);
}
