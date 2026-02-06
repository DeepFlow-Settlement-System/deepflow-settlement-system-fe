// src/api/client.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://t2.mobidic.shop";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const headers = { ...(options.headers || {}) };

  const hasBody = options.body != null;
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = localStorage.getItem("accessToken");
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "omit",
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
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
