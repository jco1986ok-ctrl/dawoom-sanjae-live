import { NextRequest, NextResponse } from "next/server";
import { assertPdfCalibrateAdmin } from "@/lib/pdf-calibrate-auth";
import {
  clearPdfLayoutCache,
  resolvePdfLayouts,
  savePdfLayoutsToDatabase,
} from "@/lib/pdf-layout-server";
import type { PdfLayouts } from "@/lib/pdf-layout-shared";

export async function GET() {
  const auth = await assertPdfCalibrateAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const resolved = await resolvePdfLayouts();
  return NextResponse.json({
    layouts: resolved.layouts,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
  });
}

interface SaveBody {
  layouts?: PdfLayouts;
}

export async function POST(request: NextRequest) {
  const auth = await assertPdfCalibrateAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const { layouts } = body;
  if (!layouts?.weim || !layouts?.daeri || !layouts?.yakjung) {
    return NextResponse.json({ error: "layouts(weim/daeri/yakjung)가 필요합니다." }, { status: 400 });
  }

  try {
    const { updatedAt } = await savePdfLayoutsToDatabase(layouts, auth.userId);
    clearPdfLayoutCache();

    return NextResponse.json({
      success: true,
      updatedAt,
      message: "PDF 좌표가 저장되었습니다. 이후 고객 접수 PDF에 바로 적용됩니다.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
