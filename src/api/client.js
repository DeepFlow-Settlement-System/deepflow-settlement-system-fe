// src/api/client.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://t2.mobidic.shop";

/**
 * apiFetch(path, options)
 * - response가 { status, message, data } 형태면 그대로 반환
 * - accessToken 있으면 Authorization 자동 첨부
 * - GET 요청에 Content-Type 억지로 안 붙임(불필요 preflight 방지)
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = {
    ...(options.headers || {}),
  };

  // body가 있을 때만 Content-Type 설정 (GET에 붙이면 preflight 생길 수 있음)
  const hasBody = options.body != null;
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // 토큰 자동 첨부
  const token = localStorage.getItem("accessToken");
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      `HTTP ${res.status} ${res.statusText}` ||
      "Request failed";
    throw new Error(msg);
  }

  return json;
}
