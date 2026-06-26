"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import {
  LAYOUT_FIELD_META,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  pdfYToCssTop,
  getSlotXY,
  setSlotXY,
  type PdfLayouts,
  type PdfTemplateName,
} from "@/lib/pdf-layout-shared";
import PdfTemplateCanvas, { type PdfViewSize } from "./PdfTemplateCanvas";

const TEMPLATE_LABELS: Record<PdfTemplateName, string> = {
  weim: "위임장",
  daeri: "대리인 선임",
  yakjung: "위임약정서",
};

const DRAFT_KEY = "pdf-calibrate-draft-v1";

function nudge(
  layout: Record<string, unknown>,
  fieldId: string,
  dx: number,
  dy: number,
): Record<string, unknown> {
  const pos = getSlotXY(layout, fieldId);
  if (!pos) return layout;
  return setSlotXY(layout, fieldId, Math.round(pos.x + dx), Math.round(pos.y + dy));
}

function formatSavedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PdfCalibrateTool() {
  const [layouts, setLayouts] = useState<PdfLayouts | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [template, setTemplate] = useState<PdfTemplateName>("weim");
  const [selectedId, setSelectedId] = useState<string>("date.year");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"database" | "file" | null>(null);
  const [viewSize, setViewSize] = useState<PdfViewSize>({
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    scale: 1,
  });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const loadFromServer = useCallback(async () => {
    const res = await fetch("/api/pdf-calibrate/layouts");
    const data = (await res.json()) as {
      layouts?: PdfLayouts;
      source?: "database" | "file";
      updatedAt?: string | null;
      error?: string;
    };
    if (!res.ok || !data.layouts) {
      throw new Error(data.error ?? "좌표를 불러오지 못했습니다.");
    }
    setLayouts(data.layouts);
    setSavedSnapshot(JSON.stringify(data.layouts));
    setSource(data.source ?? null);
    setSavedAt(data.updatedAt ?? null);
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadFromServer();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFromServer]);

  const isDirty =
    layouts !== null && savedSnapshot !== "" && JSON.stringify(layouts) !== savedSnapshot;

  useEffect(() => {
    if (isDirty && layouts) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(layouts));
    }
  }, [isDirty, layouts]);

  const currentLayout = layouts?.[template] as Record<string, unknown> | undefined;

  const patchField = useCallback(
    (fieldId: string, x: number, y: number) => {
      if (!layouts) return;
      const next = structuredClone(layouts);
      next[template] = setSlotXY(
        next[template] as Record<string, unknown>,
        fieldId,
        x,
        y,
      ) as PdfLayouts[PdfTemplateName];
      setLayouts(next);
    },
    [layouts, template],
  );

  const moveSelected = useCallback(
    (dx: number, dy: number) => {
      if (!layouts || !currentLayout) return;
      const nextLayout = nudge(currentLayout, selectedId, dx, dy);
      setLayouts({ ...layouts, [template]: nextLayout as PdfLayouts[PdfTemplateName] });
    },
    [layouts, currentLayout, selectedId, template],
  );

  const saveLayouts = useCallback(async () => {
    if (!layouts || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pdf-calibrate/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        updatedAt?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "저장 실패");
        return;
      }
      setSavedSnapshot(JSON.stringify(layouts));
      setSavedAt(data.updatedAt ?? new Date().toISOString());
      setSource("database");
      localStorage.removeItem(DRAFT_KEY);
      toast.success(data.message ?? "PDF 좌표가 저장되었습니다.");
    } finally {
      setSaving(false);
    }
  }, [layouts, saving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void saveLayouts();
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const s = e.shiftKey ? step * 5 : step;
      if (e.key === "ArrowUp") moveSelected(0, s);
      if (e.key === "ArrowDown") moveSelected(0, -s);
      if (e.key === "ArrowLeft") moveSelected(-s, 0);
      if (e.key === "ArrowRight") moveSelected(s, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveSelected, saveLayouts, step]);

  const onPointerDown = (fieldId: string, e: React.PointerEvent) => {
    e.preventDefault();
    const pos = currentLayout ? getSlotXY(currentLayout, fieldId) : null;
    if (!pos || !canvasRef.current) return;
    setSelectedId(fieldId);
    dragRef.current = {
      id: fieldId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !canvasRef.current) return;
    const scale = viewSize.scale || viewSize.width / PDF_PAGE_WIDTH;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = -(e.clientY - drag.startY) / scale;
    patchField(drag.id, Math.round(drag.origX + dx), Math.round(drag.origY + dy));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const downloadPreview = async (scope: PdfTemplateName | "all") => {
    if (!layouts) return;
    setPreviewing(true);
    try {
      const res = await fetch("/api/pdf-calibrate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: scope, layouts }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "미리보기 실패");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = scope === "all" ? "calibrate-preview.pdf" : `calibrate-${scope}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPreviewing(false);
    }
  };

  const copyJson = () => {
    if (!layouts) return;
    const exportData = {
      _comment: "config/pdf-layouts.json 백업용",
      pageSize: { width: PDF_PAGE_WIDTH, height: PDF_PAGE_HEIGHT },
      ...layouts,
    };
    void navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success("JSON이 클립보드에 복사되었습니다.");
  };

  const resetDraft = async () => {
    if (isDirty && !confirm("저장하지 않은 변경을 버리고 마지막 저장값으로 되돌릴까요?")) {
      return;
    }
    try {
      await loadFromServer();
      toast.message("마지막 저장값으로 되돌렸습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오기 실패");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">좌표 불러오는 중…</p>;
  }

  if (!layouts || !currentLayout) {
    return <p className="text-sm text-red-600">좌표를 불러오지 못했습니다.</p>;
  }

  const selectedPos = getSlotXY(currentLayout, selectedId);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">사용 방법</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>빨간 점을 드래그하거나 화살표 키로 이동</li>
          <li><strong>PDF 미리보기</strong>로 확인</li>
          <li><strong>저장하기</strong> — 이후 고객 접수 PDF에 자동 적용</li>
        </ol>
        <p className="mt-2 text-xs opacity-80">Ctrl+S 로도 저장 · Shift+화살표 = 5pt 이동</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
        <button
          type="button"
          disabled={saving || !isDirty}
          onClick={() => void saveLayouts()}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "저장 중…" : "저장하기"}
        </button>
        <span className="text-xs text-slate-500">
          {isDirty ? (
            <span className="font-semibold text-amber-600">● 저장 안 됨</span>
          ) : savedAt ? (
            <span className="text-emerald-700">
              ✓ 저장됨 ({formatSavedAt(savedAt)}
              {source === "file" && !savedAt ? " · 파일 기본값" : ""})
            </span>
          ) : (
            <span>기본값 사용 중</span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(TEMPLATE_LABELS) as PdfTemplateName[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTemplate(t);
              setSelectedId(LAYOUT_FIELD_META[t][0]?.id ?? "name");
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              template === t
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {TEMPLATE_LABELS[t]}
          </button>
        ))}
        <span className="mx-2 text-slate-300">|</span>
        <label className="flex items-center gap-1 text-sm">
          이동
          <select
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="rounded border px-2 py-1"
          >
            <option value={1}>1pt</option>
            <option value={2}>2pt</option>
            <option value={5}>5pt</option>
          </select>
        </label>
        <button
          type="button"
          disabled={previewing}
          onClick={() => downloadPreview(template)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {previewing ? "생성 중…" : "PDF 미리보기"}
        </button>
        <button
          type="button"
          disabled={previewing}
          onClick={() => downloadPreview("all")}
          className="rounded-md bg-blue-100 px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-200 disabled:opacity-50"
        >
          3종 한번에
        </button>
        <button
          type="button"
          onClick={copyJson}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          JSON 복사
        </button>
        <button
          type="button"
          onClick={() => void resetDraft()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          되돌리기
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div
          ref={canvasRef}
          className="flex min-h-[min(78vh,841px)] min-w-0 items-start justify-center rounded-lg border bg-slate-100 p-3 sm:p-4"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <PdfTemplateCanvas
            template={template}
            onSizeChange={setViewSize}
            overlay={
              <>
                {LAYOUT_FIELD_META[template].map((field) => {
                  const pos = getSlotXY(currentLayout, field.id);
                  if (!pos) return null;
                  const topPct = (pdfYToCssTop(pos.y) / PDF_PAGE_HEIGHT) * 100;
                  const leftPct = (pos.x / PDF_PAGE_WIDTH) * 100;
                  const active = field.id === selectedId;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      title={field.label}
                      onPointerDown={(e) => onPointerDown(field.id, e)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 px-1.5 py-0.5 text-[10px] font-bold shadow ${
                        active
                          ? "border-red-600 bg-red-500 text-white ring-2 ring-red-300"
                          : "border-red-400 bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    >
                      {field.preview}
                    </button>
                  );
                })}
              </>
            }
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">{TEMPLATE_LABELS[template]} 필드</h3>
          <ul className="max-h-[520px] space-y-1 overflow-y-auto text-sm">
            {LAYOUT_FIELD_META[template].map((field) => {
              const pos = getSlotXY(currentLayout, field.id);
              const active = field.id === selectedId;
              return (
                <li key={field.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(field.id)}
                    className={`w-full rounded px-2 py-1.5 text-left ${
                      active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-medium">{field.label}</div>
                    {pos && (
                      <div className={`text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                        x={pos.x} y={pos.y}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedPos && (
            <div className="rounded border bg-white p-3 text-sm">
              <p className="mb-2 font-medium">선택: {selectedId}</p>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  X
                  <input
                    type="number"
                    value={selectedPos.x}
                    onChange={(e) => patchField(selectedId, Number(e.target.value), selectedPos.y)}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={selectedPos.y}
                    onChange={(e) => patchField(selectedId, selectedPos.x, Number(e.target.value))}
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                <button type="button" className="rounded border py-1" onClick={() => moveSelected(0, step)}>↑</button>
                <button type="button" className="rounded border py-1" onClick={() => moveSelected(-step, 0)}>←</button>
                <button type="button" className="rounded border py-1" onClick={() => moveSelected(step, 0)}>→</button>
                <button type="button" className="col-span-3 rounded border py-1" onClick={() => moveSelected(0, -step)}>↓</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
