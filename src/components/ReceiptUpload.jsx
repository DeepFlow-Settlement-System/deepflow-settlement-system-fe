import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ReceiptUpload({ onOcrMock }) {
  const [file, setFile] = useState(null);

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  return (
    <Card className="p-4 space-y-3">
      <div className="font-semibold">영수증 첨부 (OCR 준비중)</div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {previewUrl && (
        <div className="rounded-lg border p-2 bg-white">
          <img src={previewUrl} alt="receipt" className="max-h-64 w-auto" />
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        * 지금은 프론트 UI만 구현되어 있고, OCR 결과는 더미로 채워집니다(나중에
        API 연결).
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!file}
          onClick={() => onOcrMock?.()}
        >
          OCR로 품목 자동 채우기(더미)
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={!file}
          onClick={() => setFile(null)}
        >
          첨부 제거
        </Button>
      </div>
    </Card>
  );
}
