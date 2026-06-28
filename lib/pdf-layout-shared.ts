export type TextSlot = { x: number; y: number; size?: number };

export type MultilineSlot = {
  x: number;
  y: number;
  lineHeight: number;
  maxWidth: number;
  maxLines: number;
  size?: number;
};

export type SignatureSlot = { x: number; y: number; width: number; height: number };

export type DateSlotGroup = {
  year: TextSlot;
  month: TextSlot;
  day: TextSlot;
  fullYear?: boolean;
  plainMonthDay?: boolean;
};

export type FeeSlot = TextSlot & { value: string };

export type WeimLayout = {
  date: DateSlotGroup;
  name: TextSlot;
  address: MultilineSlot;
  residentNumber: TextSlot;
  phone: TextSlot;
  signature: SignatureSlot;
};

export type DaeriLayout = {
  nameTop: TextSlot;
  birthDate: TextSlot;
  gender: TextSlot;
  zonecode: TextSlot;
  address: MultilineSlot;
  phone: TextSlot;
  date: DateSlotGroup;
  nameBottom: TextSlot;
  signature: SignatureSlot;
};

export type YakjungLayout = {
  name: TextSlot;
  residentNumber: TextSlot;
  address: MultilineSlot;
  phone: TextSlot;
  retainerFee: FeeSlot;
  successFee: FeeSlot;
  date: DateSlotGroup;
  nameSign: TextSlot;
  signature: SignatureSlot;
};

export type PdfLayouts = {
  weim: WeimLayout;
  daeri: DaeriLayout;
  yakjung: YakjungLayout;
};

export type PdfTemplateName = keyof PdfLayouts;

export const PDF_PAGE_WIDTH = 595;
export const PDF_PAGE_HEIGHT = 841;

export const SAMPLE_PDF_FIELDS = {
  name: "정찬옥",
  phone: "010-4373-3933",
  address: "서울특별시 도봉구 방학로 11길 30 5동 809호",
  addressBase: "서울특별시 도봉구 방학로 11길 30",
  addressDetail: "5동 809호",
  zonecode: "01383",
  residentNumberFront: "860224",
  residentNumberBack: "1041215",
} as const;

export type LayoutFieldKind = "text" | "multiline" | "signature" | "datePart";

export interface LayoutFieldMeta {
  id: string;
  label: string;
  kind: LayoutFieldKind;
  preview: string;
}

export const LAYOUT_FIELD_META: Record<PdfTemplateName, LayoutFieldMeta[]> = {
  weim: [
    { id: "date.year", label: "날짜 · 년(26)", kind: "datePart", preview: "26" },
    { id: "date.month", label: "날짜 · 월", kind: "datePart", preview: "6" },
    { id: "date.day", label: "날짜 · 일", kind: "datePart", preview: "11" },
    { id: "name", label: "성명", kind: "text", preview: "정찬옥" },
    { id: "address", label: "주소 (1줄)", kind: "multiline", preview: "서울…" },
    { id: "residentNumber", label: "주민번호", kind: "text", preview: "860224-…" },
    { id: "phone", label: "전화번호", kind: "text", preview: "010-…" },
    { id: "signature", label: "서명", kind: "signature", preview: "서명" },
  ],
  daeri: [
    { id: "nameTop", label: "성명", kind: "text", preview: "정찬옥" },
    { id: "birthDate", label: "생년월일", kind: "text", preview: "860224" },
    { id: "gender", label: "성별", kind: "text", preview: "남" },
    { id: "zonecode", label: "우편번호", kind: "text", preview: "01383" },
    { id: "address", label: "주소", kind: "multiline", preview: "서울…" },
    { id: "phone", label: "H.P", kind: "text", preview: "010-…" },
    { id: "date.year", label: "하단 날짜 · 년", kind: "datePart", preview: "26" },
    { id: "date.month", label: "하단 날짜 · 월", kind: "datePart", preview: "6" },
    { id: "date.day", label: "하단 날짜 · 일", kind: "datePart", preview: "11" },
    { id: "nameBottom", label: "신고인 성명", kind: "text", preview: "정찬옥" },
    { id: "signature", label: "서명", kind: "signature", preview: "서명" },
  ],
  yakjung: [
    { id: "name", label: "성명", kind: "text", preview: "정찬옥" },
    { id: "residentNumber", label: "주민번호", kind: "text", preview: "860224-…" },
    { id: "address", label: "주소", kind: "multiline", preview: "서울…" },
    { id: "phone", label: "전화번호", kind: "text", preview: "010-…" },
    { id: "retainerFee", label: "착수금 0", kind: "text", preview: "0" },
    { id: "successFee", label: "성공보수 25", kind: "text", preview: "25" },
    { id: "date.year", label: "날짜 · 년", kind: "datePart", preview: "26" },
    { id: "date.month", label: "날짜 · 월", kind: "datePart", preview: "6" },
    { id: "date.day", label: "날짜 · 일", kind: "datePart", preview: "11" },
    { id: "nameSign", label: "위임인(갑) 성명", kind: "text", preview: "정찬옥" },
    { id: "signature", label: "서명", kind: "signature", preview: "서명" },
  ],
};

export function getSlotXY(
  layout: Record<string, unknown>,
  fieldId: string,
): { x: number; y: number } | null {
  const parts = fieldId.split(".");
  let cur: unknown = layout;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  if (!cur || typeof cur !== "object") return null;
  const slot = cur as { x?: number; y?: number };
  if (typeof slot.x !== "number" || typeof slot.y !== "number") return null;
  return { x: slot.x, y: slot.y };
}

export function setSlotXY(
  layout: Record<string, unknown>,
  fieldId: string,
  x: number,
  y: number,
): Record<string, unknown> {
  const parts = fieldId.split(".");
  const clone = structuredClone(layout);
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  const leaf = cur[parts[parts.length - 1]] as Record<string, unknown>;
  leaf.x = x;
  leaf.y = y;
  return clone;
}

export function pdfYToCssTop(y: number, pageHeight = PDF_PAGE_HEIGHT): number {
  return pageHeight - y;
}

export function cssTopToPdfY(top: number, pageHeight = PDF_PAGE_HEIGHT): number {
  return pageHeight - top;
}

export function deepMergeLayouts<T extends Record<string, unknown>>(
  base: T,
  patch?: Partial<T>,
): T {
  if (!patch) return base;
  const out = { ...base } as T;
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key];
    const bv = base[key];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMergeLayouts(
        bv as Record<string, unknown>,
        pv as Record<string, unknown>,
      ) as T[keyof T];
    } else if (pv !== undefined) {
      out[key] = pv as T[keyof T];
    }
  }
  return out;
}
