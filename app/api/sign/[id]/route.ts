import { NextRequest, NextResponse } from "next/server";
import type { WeimCustomerInfoInput } from "@/lib/merge-lead-weim-info";
import {
  completeWeimSignForLead,
  getWeimSignPageState,
  isValidLeadId,
} from "@/lib/standalone-weim-sign";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !isValidLeadId(id)) {
    return NextResponse.json({ error: "잘못된 링크입니다." }, { status: 400 });
  }

  const state = await getWeimSignPageState(id);
  return NextResponse.json(state);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || !isValidLeadId(id)) {
    return NextResponse.json({ error: "잘못된 링크입니다." }, { status: 400 });
  }

  let body: { signature?: string; customerInfo?: WeimCustomerInfoInput };
  try {
    body = (await request.json()) as {
      signature?: string;
      customerInfo?: WeimCustomerInfoInput;
    };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.signature?.trim()) {
    return NextResponse.json({ error: "서명이 필요합니다." }, { status: 400 });
  }

  const result = await completeWeimSignForLead(id, body.signature, body.customerInfo);
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
