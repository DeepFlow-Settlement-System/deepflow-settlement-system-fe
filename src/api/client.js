// src/api/client.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://t2.mobidic.shop";

function joinUrl(base, path) {
  if (path.startsWith("http")) return path;
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function apiFetch(path, options = {}) {
  const url = joinUrl(API_BASE_URL, path);

  const headers = { ...(options.headers || {}) };
  const hasBody = options.body != null;

  // ✅ FormData면 Content-Type을 절대 직접 설정하지 말 것 (boundary 때문에 깨짐)
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // ✅ accessToken 있으면 Bearer 자동 첨부
  const token = localStorage.getItem("accessToken");
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "omit",
  });

  // 응답이 비어있을 수 있음
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text ? { raw: text } : null;
  }

  if (!res.ok) {
    console.error("API ERROR", {
      url,
      status: res.status,
      statusText: res.statusText,
      body: json,
    });

    const msg =
      json?.message ||
      json?.error ||
      json?.raw ||
      `HTTP ${res.status} ${res.statusText}` ||
      "Request failed";

    throw new Error(msg);
  }

  return json;
}
