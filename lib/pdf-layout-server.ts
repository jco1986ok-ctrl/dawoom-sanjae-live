import fs from "fs/promises";
import path from "path";
import {
  deepMergeLayouts,
  type PdfLayouts,
} from "./pdf-layout-shared.ts";
import {
  loadPdfLayoutsFromDatabase,
  type PdfLayoutLoadResult,
  type PdfLayoutSource,
} from "./pdf-layout-store.ts";

export type {
  DaeriLayout,
  PdfLayouts,
  PdfTemplateName,
  WeimLayout,
  YakjungLayout,
} from "./pdf-layout-shared.ts";

export { savePdfLayoutsToDatabase } from "./pdf-layout-store.ts";
export {
  LAYOUT_FIELD_META,
  SAMPLE_PDF_FIELDS,
  getSlotXY,
  setSlotXY,
  pdfYToCssTop,
  cssTopToPdfY,
} from "./pdf-layout-shared.ts";

const LAYOUT_PATH = path.join(process.cwd(), "config", "pdf-layouts.json");

let cachedLayouts: PdfLayouts | null = null;
let cachedMeta: { source: PdfLayoutSource; updatedAt: string | null } | null = null;

export async function loadPdfLayoutsFromDisk(): Promise<PdfLayouts> {
  const raw = await fs.readFile(LAYOUT_PATH, "utf8");
  const parsed = JSON.parse(raw) as PdfLayouts & { _comment?: string; pageSize?: unknown };
  return {
    weim: parsed.weim,
    daeri: parsed.daeri,
    yakjung: parsed.yakjung,
  };
}

/** DB 저장값 우선, 없으면 config/pdf-layouts.json */
export async function resolvePdfLayouts(): Promise<PdfLayoutLoadResult> {
  const fromDb = await loadPdfLayoutsFromDatabase();
  if (fromDb) return fromDb;

  const layouts = await loadPdfLayoutsFromDisk();
  return { layouts, source: "file", updatedAt: null };
}

export async function getPdfLayouts(overrides?: Partial<PdfLayouts>): Promise<PdfLayouts> {
  if (!cachedLayouts) {
    const resolved = await resolvePdfLayouts();
    cachedLayouts = resolved.layouts;
    cachedMeta = { source: resolved.source, updatedAt: resolved.updatedAt };
  }
  if (!overrides) return cachedLayouts;

  return {
    weim: deepMergeLayouts(cachedLayouts.weim, overrides.weim),
    daeri: deepMergeLayouts(cachedLayouts.daeri, overrides.daeri),
    yakjung: deepMergeLayouts(cachedLayouts.yakjung, overrides.yakjung),
  };
}

export function getPdfLayoutCacheMeta() {
  return cachedMeta;
}

export function clearPdfLayoutCache() {
  cachedLayouts = null;
  cachedMeta = null;
}
