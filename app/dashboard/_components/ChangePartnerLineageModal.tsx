"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AffiliatePartnerRow } from "./PartnerAccordionTable";
import type { ParentPartnerOption } from "@/lib/partner-lineage";
import { parentPartnerRoleLabel } from "@/lib/partner-lineage";
import { updateAffiliateParentAction } from "../_actions/users";

interface Props {
  affiliate: AffiliatePartnerRow | null;
  open: boolean;
  parentOptions: ParentPartnerOption[];
  onClose: () => void;
  onSaved: (affiliateId: string, newParentId: string, newParentName: string) => void;
}

export default function ChangePartnerLineageModal({
  affiliate,
  open,
  parentOptions,
  onClose,
  onSaved,
}: Props) {
  const [selectedParentId, setSelectedParentId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (affiliate && open) {
      setSelectedParentId(affiliate.parentAgentId ?? "");
    }
  }, [affiliate, open]);

  const handleSave = () => {
    if (!affiliate) return;
    if (!selectedParentId) {
      toast.error("변경할 상위 파트너를 선택해 주세요.");
      return;
    }
    if (selectedParentId === affiliate.parentAgentId) {
      toast.error("현재와 동일한 상위 파트너입니다.");
      return;
    }

    const newParent = parentOptions.find((p) => p.id === selectedParentId);
    if (!newParent) {
      toast.error("유효하지 않은 상위 파트너입니다.");
      return;
    }

    startTransition(async () => {
      const result = await updateAffiliateParentAction(affiliate.id, selectedParentId);
      if (result.success) {
        toast.success(result.message);
        onSaved(affiliate.id, selectedParentId, newParent.name);
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">상위 파트너 변경</DialogTitle>
          <DialogDescription className="text-left">
            {affiliate ? (
              <>
                <span className="font-semibold text-slate-800">{affiliate.name}</span>님의 소속
                라인을 변경합니다.
              </>
            ) : (
              "제휴 파트너의 상위 파트너를 변경합니다."
            )}
          </DialogDescription>
        </DialogHeader>

        {affiliate && (
          <div className="flex flex-col gap-4 py-1">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="text-slate-500 mb-1">현재 상위 파트너</p>
              <p className="font-bold text-slate-900 whitespace-nowrap break-keep">
                {affiliate.parentName || "미지정"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="new-parent-select" className="text-sm font-semibold text-slate-700">
                변경할 상위 파트너 선택
              </label>
              <select
                id="new-parent-select"
                value={selectedParentId}
                disabled={pending}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e]/40"
              >
                <option value="">상위 파트너를 선택하세요</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({parentPartnerRoleLabel(p.role)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold
              border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !affiliate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold
              bg-[#0f2d5e] text-white hover:bg-[#1a3d7a] disabled:opacity-50 transition-colors"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            저장
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
