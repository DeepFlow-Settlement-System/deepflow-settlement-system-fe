// src/api/users.js
import { apiFetch } from "./client";

/**
 * 현재 로그인한 사용자 정보 조회
 * @returns {Promise<Object>} 사용자 정보 {id, kakaoId, username, kakaoPaySuffix, nickname}
 */
export async function getMe() {
  const res = await apiFetch("/api/user/me");
  return res?.data || res;
}
