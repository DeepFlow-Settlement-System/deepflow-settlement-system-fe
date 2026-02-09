// src/api/groups.js
import { apiFetch } from "./client";

/**
 * 사용자 그룹 목록 조회
 * @returns {Promise<Array>} 그룹 목록
 */
export async function getGroups() {
  const res = await apiFetch("/api/groups");
  return Array.isArray(res) ? res : [];
}

/**
 * 그룹 상세 조회
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<Object>} 그룹 상세 정보 (멤버 포함)
 */
export async function getGroupDetail(groupId) {
  return await apiFetch(`/api/groups/${groupId}`);
}

/**
 * 그룹 생성
 * @param {Object} groupData - 그룹 생성 데이터
 * @param {string} groupData.name - 그룹 이름 (필수)
 * @param {string} [groupData.description] - 그룹 설명
 * @returns {Promise<Object>} 생성된 그룹 정보
 */
export async function createGroup(groupData) {
  return await apiFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify(groupData),
  });
}

/**
 * 그룹 초대 코드 조회
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<Object>} 초대 코드 및 링크
 */
export async function getInviteCode(groupId) {
  return await apiFetch(`/api/groups/${groupId}/invite-code`);
}

/**
 * 초대 코드로 그룹 정보 조회 (인증 불필요)
 * @param {string} code - 초대 코드
 * @returns {Promise<Object>} 그룹 정보
 */
export async function getJoinInfo(code) {
  return await apiFetch(`/api/groups/join?code=${encodeURIComponent(code)}`);
}

/**
 * 초대 코드로 그룹 참여
 * @param {string} code - 초대 코드
 * @returns {Promise<Object>} 참여 결과
 */
export async function joinGroup(code) {
  return await apiFetch(`/api/groups/join?code=${encodeURIComponent(code)}`, {
    method: "POST",
  });
}

/**
 * 그룹 탈퇴
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<void>}
 */
export async function leaveGroup(groupId) {
  await apiFetch(`/api/groups/${groupId}/leave`, {
    method: "POST",
  });
}
