// src/lib/receiptParser.js
function pick(...vals) {
  for (const v of vals) if (v != null && v !== "") return v;
  return null;
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseReceiptOcr(analysisJson) {
  // ✅ 흔한 구조: { images: [{ receipt: { result: ... } }] }
  const img0 = analysisJson?.images?.[0] ?? analysisJson?.data?.images?.[0];

  const result =
    img0?.receipt?.result ??
    img0?.result ??
    analysisJson?.receipt?.result ??
    analysisJson?.data?.receipt?.result ??
    analysisJson;

  const merchant = pick(
    result?.storeInfo?.name?.formatted?.value,
    result?.storeInfo?.name?.value,
    result?.merchant?.name,
    result?.merchantName,
  );

  const paidAt = pick(
    result?.paymentInfo?.date?.formatted?.value,
    result?.paymentInfo?.date?.value,
    result?.paidAt,
    result?.date,
  );

  const total = toNumber(
    pick(
      result?.totalPrice?.price?.formatted?.value,
      result?.totalPrice?.price?.value,
      result?.totalPrice?.formatted?.value,
      result?.totalPrice?.value,
      result?.total,
      result?.amount,
    ),
  );

  const itemsRaw =
    result?.subResults?.[0]?.items ??
    result?.subResults?.items ??
    result?.items ??
    [];

  const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map((it) => {
    const name =
      pick(it?.name?.formatted?.value, it?.name?.value, it?.name) || "품목";
    const price = toNumber(
      pick(
        it?.price?.price?.formatted?.value,
        it?.price?.formatted?.value,
        it?.price?.value,
        it?.price,
        it?.unitPrice,
      ),
    );
    const qty =
      toNumber(
        pick(it?.count?.formatted?.value, it?.count?.value, it?.qty, it?.count),
      ) || 1;

    return { name, price, qty };
  });

  return {
    merchant: merchant || "",
    paidAt: paidAt || "",
    total: total || 0,
    items,
    raw: analysisJson,
  };
}
