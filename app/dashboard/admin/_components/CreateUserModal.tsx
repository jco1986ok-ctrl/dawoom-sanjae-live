"use client";

import { useActionState, useState, useEffect } from "react";
import { X, UserPlus, CheckCircle2, AlertCircle, ChevronDown, Sparkles } from "lucide-react";
import { createUserAction } from "../actions";
import type { UserRole } from "@/lib/types";

export interface RoleOption {
  value: UserRole;
  label: string;
  desc: string;
}

export interface Partner {
  id: string;
  name: string;
  agent_id: string;
}

/** 역할 전체 정의 (label·desc) */
export const ALL_ROLE_OPTIONS: RoleOption[] = [
  { value: "총괄공식파트너", label: "총괄 파트너",  desc: "공식 파트너·제휴 멤버·노무사를 관리하는 최상위 파트너" },
  { value: "총판영업자",     label: "공식 파트너",  desc: "소속 제휴 멤버를 관리하는 마스터 파트너" },
  { value: "하위영업자",     label: "제휴 멤버",    desc: "공식 파트너 소속 제휴 멤버" },
  { value: "대표노무사",     label: "대표 노무사",   desc: "전체 사건 열람 + 노무사 배당 권한" },
  { value: "노무사",         label: "노무사",         desc: "배당받은 사건만 열람 및 상태 변경" },
  { value: "관리자",         label: "관리자",        desc: "시스템 전체 관리자" },
];

interface CreateUserModalProps {
  /** 이 모달에서 생성 가능한 역할 목록 */
  allowedRoles: UserRole[];
  /** 제휴 멤버 생성 시 부모(공식 파트너) 선택용 */
  partners?: Partner[];
  /** 버튼 라벨 (기본: "직원 계정 생성") */
  buttonLabel?: string;
}

export default function CreateUserModal({
  allowedRoles,
  partners = [],
  buttonLabel = "직원 계정 생성",
}: CreateUserModalProps) {
  const roleOptions = ALL_ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));
  const defaultRole = roleOptions[0]?.value ?? "하위영업자";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [state, formAction, isPending] = useActionState(createUserAction, null);

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => setIsOpen(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const handleOpen = () => {
    setIsOpen(true);
    setSelectedRole(defaultRole);
  };

  const needsParentSelect = selectedRole === "하위영업자" && partners.length > 0;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-[#0f2d5e] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#1a3f7a] transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        {buttonLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* 헤더 */}
            <div className="bg-[#0f2d5e] px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-black text-lg">신규 계정 생성</h2>
                <p className="text-blue-300 text-xs mt-0.5">파트너 코드는 시스템이 자동으로 발급합니다.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-blue-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 성공 */}
            {state?.success && (
              <div className="mx-6 mt-4 flex flex-col gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 font-medium">{state.message}</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-100 rounded-lg px-3 py-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600">발급된 파트너 코드:</span>
                  <span className="font-mono font-black text-emerald-800 text-sm tracking-widest">{state.agentId}</span>
                </div>
              </div>
            )}

            {/* 에러 */}
            {state && !state.success && (
              <div className="mx-6 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{state.error}</p>
              </div>
            )}

            {/* 폼 */}
            <form action={formAction} className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

              <FormField label="이메일 (로그인 ID)" required>
                <input name="email" type="email" required placeholder="example@parros.kr" className={inputCls} />
              </FormField>

              <FormField label="임시 비밀번호" required hint="8자 이상, 직원에게 별도 전달하세요">
                <input name="password" type="password" required minLength={8} placeholder="8자 이상 입력" className={inputCls} />
              </FormField>

              <FormField label="이름" required>
                <input name="name" type="text" required placeholder="홍길동" className={inputCls} />
              </FormField>

              {/* 자동 코드 안내 */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-[#0f2d5e]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#0f2d5e]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">파트너 코드 자동 발급</p>
                  <p className="text-xs text-slate-400 mt-0.5">AG-XXXXXX 형식의 고유 코드가 자동으로 부여됩니다.</p>
                </div>
              </div>

              {/* 계급 선택 */}
              <FormField label="계급 (Role)" required>
                <div className="relative">
                  <select
                    name="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 px-1">
                  {roleOptions.find((r) => r.value === selectedRole)?.desc}
                </p>
                <div className="flex gap-2 flex-wrap mt-1">
                  {roleOptions.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSelectedRole(r.value)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                        selectedRole === r.value
                          ? "bg-[#0f2d5e] text-white border-[#0f2d5e]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* 제휴 멤버 전용: 직속 파트너 선택 */}
              {needsParentSelect && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full w-fit">
                    제휴 멤버 전용
                  </span>
                  <FormField label="직속 공식 파트너" required hint="소속될 파트너를 선택하세요">
                    <div className="relative">
                      <select
                        name="parent_agent_id"
                        required
                        defaultValue=""
                        className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                      >
                        <option value="" disabled>— 공식 파트너 선택 —</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.agent_id})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </FormField>
                </div>
              )}

              <div className="flex gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || state?.success === true}
                  className="flex-1 bg-[#0f2d5e] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1a3f7a] transition-colors disabled:opacity-50"
                >
                  {isPending ? "생성 중..." : state?.success ? "생성 완료 ✓" : "계정 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] transition-colors";

function FormField({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {hint && <span className="text-xs text-slate-400 font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
