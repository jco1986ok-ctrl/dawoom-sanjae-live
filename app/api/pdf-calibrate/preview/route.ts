import { NextRequest, NextResponse } from "next/server";
import { assertPdfCalibrateAdmin } from "@/lib/pdf-calibrate-auth";
import {
  buildContractPdfFields,
  ContractPdfAssetError,
  generateMergedContractPdf,
  generateSingleTemplatePdf,
} from "@/lib/contract-pdf";
import type { PdfLayouts, PdfTemplateName } from "@/lib/pdf-layout-shared";

const MINI_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkHAAAAAASUVORK5CYII=";

interface PreviewBody {
  template?: PdfTemplateName | "all";
  layouts?: Partial<PdfLayouts>;
}

export async function POST(request: NextRequest) {
  const auth = await assertPdfCalibrateAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const fields = buildContractPdfFields({
    name: "정찬옥",
    phone: "010-4373-3933",
    address: "서울특별시 도봉구 방학로 11길 30 5동 809호",
    addressBase: "서울특별시 도봉구 방학로 11길 30",
    addressDetail: "5동 809호",
    zonecode: "01383",
    residentNumberFront: "860224",
    residentNumberBack: "1041215",
  });

  const signature = `data:image/png;base64,${MINI_PNG}`;
  const template = body.template ?? "all";

  try {
    const pdfBytes =
      template === "all"
        ? await generateMergedContractPdf(fields, signature, body.layouts)
        : await generateSingleTemplatePdf(template, fields, signature, body.layouts);

    const filename =
      template === "all" ? "calibrate-preview-3p.pdf" : `calibrate-preview-${template}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ContractPdfAssetError) {
      return NextResponse.json({ error: err.message, missingFiles: err.missingFiles }, { status: 500 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
