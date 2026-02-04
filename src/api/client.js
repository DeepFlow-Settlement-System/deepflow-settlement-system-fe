// src/api/client.js

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * 프로젝트에서 토큰을 어디에 저장하는지 아직 확실하지 않아서
 * 가능한 케이스를 넓게 잡아둠.
 * - accessToken
 * - token
 */
function getToken() {
  return (
    localStorage.getItem("accessToken") || localStorage.getItem("token") || ""
  );
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function apiFetch(path, { method = "GET", headers, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
  });

  // 백엔드가 ApiResponse 형태면 json.data에 있을 가능성이 높음
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof text === "string" && text) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}
