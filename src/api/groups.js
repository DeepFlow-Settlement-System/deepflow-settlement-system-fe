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

/**
 * 그룹 이미지 조회 (byte[] 응답을 blob URL로 변환)
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<string|null>} 이미지 blob URL 또는 null (이미지 없음)
 */
export async function getGroupImage(groupId) {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "https://t2.mobidic.shop";
  const url = `${API_BASE_URL}/api/groups/${groupId}/image`;

  const token = localStorage.getItem("accessToken");
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
    });

    if (!res.ok) {
      if (res.status === 404) {
        // 이미지가 없으면 null 반환
        return null;
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    if (e.message?.includes("404") || e.message?.includes("Not Found")) {
      return null;
    }
    throw e;
  }
}

/**
 * 그룹 이미지 업로드
 * @param {number} groupId - 그룹 ID
 * @param {File|Blob} file - 이미지 파일
 * @returns {Promise<string>} 업로드된 이미지 URL
 */
export async function uploadGroupImage(groupId, file) {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "https://t2.mobidic.shop";
  const url = `${API_BASE_URL}/api/groups/${groupId}/image`;

  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("accessToken");
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    const msg =
      json?.message ||
      json?.error ||
      json?.raw ||
      `HTTP ${res.status} ${res.statusText}` ||
      "Request failed";
    throw new Error(msg);
  }

  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    return json;
  } catch {
    return text;
  }
}

/**
 * 그룹 이미지 삭제
 * @param {number} groupId - 그룹 ID
 * @returns {Promise<void>}
 */
export async function deleteGroupImage(groupId) {
  await apiFetch(`/api/groups/${groupId}/image`, {
    method: "DELETE",
  });
}
