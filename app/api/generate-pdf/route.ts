import { NextRequest, NextResponse } from "next/server";
import { handleGenerateContract, type GenerateContractBody } from "@/lib/generate-contract-api";
import { completeWeimSignForLead } from "@/lib/standalone-weim-sign";
import type { WeimCustomerInfoInput } from "@/lib/merge-lead-weim-info";

/** @deprecated /api/generate-contract 사용 권장 — 하위 호환 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateContractBody & {
      existingLeadId?: string;
      customerInfo?: WeimCustomerInfoInput;
    };

    if (body.existingLeadId && body.signature) {
      const result = await completeWeimSignForLead(
        body.existingLeadId,
        body.signature,
        body.customerInfo,
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        success: true,
        leadId: result.leadId,
        pdfUrl: result.pdfUrl,
        hasWeim: true,
      });
    }

    return handleGenerateContract(body, { defaultTestMode: false });
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 요청 형식입니다." }, { status: 400 });
  }
}
