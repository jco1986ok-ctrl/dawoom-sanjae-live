import { createAdminClient } from "@/lib/supabase/admin";
import type { PdfLayouts } from "./pdf-layout-shared.ts";

const SETTINGS_ID = "default";

export type PdfLayoutSource = "database" | "file";

export interface PdfLayoutLoadResult {
  layouts: PdfLayouts;
  source: PdfLayoutSource;
  updatedAt: string | null;
}

function isPdfLayouts(value: unknown): value is PdfLayouts {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Boolean(v.weim && v.daeri && v.yakjung);
}

function parseRowLayouts(raw: unknown): PdfLayouts | null {
  if (!isPdfLayouts(raw)) return null;
  return {
    weim: raw.weim,
    daeri: raw.daeri,
    yakjung: raw.yakjung,
  };
}

export async function loadPdfLayoutsFromDatabase(): Promise<PdfLayoutLoadResult | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pdf_layout_settings")
      .select("layouts, updated_at")
      .eq("id", SETTINGS_ID)
      .maybeSingle();

    if (error) {
      if (/relation.*does not exist|schema cache/i.test(error.message)) {
        console.warn("[pdf-layout-store] pdf_layout_settings 테이블 없음 — supabase/11 실행 필요");
        return null;
      }
      console.warn("[pdf-layout-store] DB 조회 실패:", error.message);
      return null;
    }

    if (!data?.layouts) return null;

    const layouts = parseRowLayouts(data.layouts);
    if (!layouts) return null;

    return {
      layouts,
      source: "database",
      updatedAt: (data.updated_at as string | null) ?? null,
    };
  } catch (err) {
    console.warn("[pdf-layout-store] DB 접근 불가:", err);
    return null;
  }
}

export async function savePdfLayoutsToDatabase(
  layouts: PdfLayouts,
  updatedBy: string,
): Promise<{ updatedAt: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_layout_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        layouts,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    if (/relation.*does not exist|schema cache/i.test(error.message)) {
      throw new Error(
        "저장 테이블이 없습니다. Supabase SQL Editor에서 supabase/11_pdf_layout_settings.sql 을 실행해 주세요.",
      );
    }
    throw new Error(error.message);
  }

  return { updatedAt: (data.updated_at as string) ?? new Date().toISOString() };
}
