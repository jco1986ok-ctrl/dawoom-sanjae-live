"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PwaInstallIosDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-br from-[#0f2d5e] to-[#1a4480] px-5 pt-6 pb-5 text-left">
          <DialogTitle className="text-white text-lg font-black leading-snug">
            아이폰 앱 설치 안내
          </DialogTitle>
          <DialogDescription className="sr-only">
            Safari에서 홈 화면에 추가하는 방법
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-5 space-y-4 text-sm text-foreground leading-relaxed">
          <p className="font-semibold">
            1. 브라우저 맨 하단의{" "}
            <strong className="text-primary">[공유(가운데 화살표)]</strong> 버튼을 누르세요.
          </p>
          <p className="font-semibold">
            2. 메뉴를 내려서{" "}
            <strong className="text-primary">[홈 화면에 추가]</strong>를 선택해 주세요.
          </p>
          <p className="text-xs text-muted-foreground">
            설치 후 홈 화면의 파로스 아이콘으로 대시보드에 바로 접속할 수 있습니다.
          </p>
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-bold py-3
                       active:scale-[0.98] transition-transform"
          >
            확인했습니다
          </button>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          aria-label="닫기"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
