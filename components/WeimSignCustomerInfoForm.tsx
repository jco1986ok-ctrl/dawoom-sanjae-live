"use client";

import { useEffect, useState } from "react";
import type { WeimCustomerInfoInput } from "@/lib/merge-lead-weim-info";
import type { AddressSearchResult } from "@/components/AddressSearchBottomSheet";

const INPUT =
  "w-full min-w-0 px-4 py-3.5 rounded-2xl bg-white text-[#191F28] text-[15px] tracking-[-0.02em] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-transparent focus:border-[#3182F6] focus:outline-none";

const PERSONAL_INFO_CONSENT_BODY = `1. 수집 항목: 성명, 연락처, 주소, 병력 및 진단명
2. 수집 목적: 산업재해보상보험법에 따른 요양/휴업/장해 급여 청구 대리, 무료 진단 및 상담, 공공기관 서류 자동 발급 (마이데이터 연동)
3. 보유 및 이용 기간: 사건 종결 후 5년 보관 후 파기 (관련 법령에 따름)
※ 귀하는 동의를 거부할 권리가 있으나, 거부 시 산재 접수 및 수속 대행이 불가능합니다.`;

const UNIQUE_ID_CONSENT_BODY = `1. 수집 항목: 주민등록번호
2. 수집 목적: 근로복지공단·관공서 제출용 산재 접수 서류 작성, 본인 확인 및 급여 청구 대리
3. 보유 및 이용 기간: 사건 종결 후 5년 보관 후 파기 (관련 법령에 따름)
※ 주민등록번호는 관련 법령에 따른 필수 수집 항목이며, 거부 시 산재 접수 및 수속 대행이 불가능합니다.`;

function maskResidentNumberBack(digits: string): string {
  if (!digits) return "";
  if (digits.length === 1) return digits;
  return digits[0] + "•".repeat(digits.length - 1);
}

function buildFullAddress(base: string, detail: string): string {
  const b = base.trim();
  const d = detail.trim();
  if (!b) return d;
  if (!d) return b;
  return `${b}, ${d}`;
}

function splitPrefillAddress(address?: string): { base: string; detail: string } {
  if (!address?.trim()) return { base: "", detail: "" };
  const comma = address.indexOf(",");
  if (comma > 0) {
    return {
      base: address.slice(0, comma).trim(),
      detail: address.slice(comma + 1).trim(),
    };
  }
  return { base: address.trim(), detail: "" };
}

function ConsentCheckItem({
  id,
  checked,
  onChange,
  label,
  detail,
  bold,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  detail?: string;
  bold?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-[#3182F6] focus:ring-[#3182F6]"
        />
        <span
          className={`text-[14px] text-[#191F28] leading-snug tracking-[-0.02em] ${
            bold ? "font-bold" : ""
          }`}
        >
          {label}
        </span>
      </label>
      {detail && (
        <div className="bg-gray-50 p-3 rounded-lg text-[12px] text-gray-500 mt-2 ml-7 whitespace-pre-line leading-relaxed">
          {detail}
        </div>
      )}
    </div>
  );
}

export type WeimSignCustomerInfoFormValue = WeimCustomerInfoInput;

interface Props {
  customerName: string;
  prefillAddress?: string;
  onSubmit: (value: WeimSignCustomerInfoFormValue) => void;
  onAddressSearch: () => void;
  onBindAddressPick: (pick: (result: AddressSearchResult) => void) => void;
}

export function WeimSignCustomerInfoForm({
  customerName,
  prefillAddress,
  onSubmit,
  onAddressSearch,
  onBindAddressPick,
}: Props) {
  const prefill = splitPrefillAddress(prefillAddress);
  const [residentNumberFront, setResidentNumberFront] = useState("");
  const [residentNumberBack, setResidentNumberBack] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [addressBase, setAddressBase] = useState(prefill.base);
  const [addressDetail, setAddressDetail] = useState(prefill.detail);
  const [consentPersonalInfo, setConsentPersonalInfo] = useState(false);
  const [consentUniqueId, setConsentUniqueId] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onBindAddressPick((result) => {
      if (result.zonecode) setZonecode(result.zonecode);
      const base = result.roadAddress || result.address;
      if (base) setAddressBase(base);
    });
  }, [onBindAddressPick]);

  const handleAddressSearch = () => {
    setError(null);
    onAddressSearch();
  };

  const handleRrnBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9•]/g, "");
    const prev = residentNumberBack;

    if (raw.length > prev.length) {
      const ch = raw.replace(/•/g, "").slice(-1);
      if (ch) setResidentNumberBack((prev + ch).slice(0, 7));
      return;
    }

    if (raw.length === 0) {
      setResidentNumberBack("");
      return;
    }

    setResidentNumberBack(prev.slice(0, -1));
  };

  const handleSubmit = () => {
    const value: WeimSignCustomerInfoFormValue = {
      residentNumberFront,
      residentNumberBack,
      address: buildFullAddress(addressBase, addressDetail),
      consentPersonalInfo,
      consentUniqueId,
    };

    if (value.residentNumberFront.replace(/\D/g, "").length !== 6) {
      setError("주민등록번호 앞 6자리를 입력해 주세요.");
      return;
    }
    if (value.residentNumberBack.replace(/\D/g, "").length !== 7) {
      setError("주민등록번호 뒤 7자리를 입력해 주세요.");
      return;
    }
    if (addressBase.trim().length < 2) {
      setError("주소 검색 버튼을 눌러 주소를 입력해 주세요.");
      return;
    }
    if (!consentPersonalInfo || !consentUniqueId) {
      setError("필수 동의 항목에 모두 체크해 주세요.");
      return;
    }

    setError(null);
    onSubmit(value);
  };

  const allConsented = consentPersonalInfo && consentUniqueId;
  const displayName = customerName.trim() || "고객";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white max-w-md mx-auto w-full">
      <main className="flex-1 px-5 pt-4 pb-32">
        <h1 className="text-[22px] font-bold text-[#191F28] leading-[1.45] tracking-[-0.03em]">
          안녕하세요 {displayName}님,
        </h1>
        <p className="text-[15px] text-[#8B95A1] mt-2 leading-relaxed tracking-[-0.02em]">
          위임장 작성을 위해 아래 정보를 입력해 주세요.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              주민등록번호
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={residentNumberFront}
                onChange={(e) =>
                  setResidentNumberFront(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                placeholder="앞 6자리"
                className={`${INPUT} text-center tabular-nums`}
              />
              <span className="text-[#8B95A1] font-semibold text-center px-0.5">-</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={maskResidentNumberBack(residentNumberBack)}
                onChange={handleRrnBackChange}
                placeholder="뒤 7자리"
                className={`${INPUT} text-center tabular-nums tracking-widest`}
                aria-label="주민등록번호 뒷자리"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#8B95A1] tracking-[-0.02em]">
              성별 코드(첫 자리)만 표시되며, 나머지는 •로 마스킹됩니다.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-2">
              주소
            </label>
            <button
              type="button"
              onClick={handleAddressSearch}
              className="w-full mb-2 py-3.5 rounded-2xl bg-[#3182F6] text-white font-bold text-[15px] tracking-[-0.02em] active:scale-[0.98] transition-transform shadow-[0_4px_14px_rgba(49,130,246,0.28)]"
            >
              주소 검색
            </button>
            <input
              type="text"
              readOnly
              inputMode="numeric"
              value={zonecode}
              placeholder="우편번호"
              className={`${INPUT} bg-[#F9FAFB] text-[#4E5968] mb-2 tabular-nums`}
              aria-label="우편번호"
            />
            <input
              type="text"
              readOnly
              value={addressBase}
              placeholder="도로명 주소 (주소 검색 버튼을 눌러주세요)"
              className={`${INPUT} bg-[#F9FAFB] text-[#4E5968] mb-2`}
              aria-label="도로명 주소"
            />
            {addressBase.length > 0 && (
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세 주소 (동/호수)"
                className={INPUT}
              />
            )}
          </div>

          <div className="rounded-2xl border border-[#EEF0F3] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <p className="text-[13px] font-semibold text-[#8B95A1] tracking-[-0.02em] mb-3">
              개인정보 및 고유식별정보 수집·이용 동의
            </p>

            <ConsentCheckItem
              id="weim-consent-all"
              checked={allConsented}
              onChange={(checked) => {
                setConsentPersonalInfo(checked);
                setConsentUniqueId(checked);
              }}
              bold
              label="[필수] 약관에 모두 동의합니다."
            />

            <div className="border-b border-gray-100 my-3" />

            <div className="space-y-4">
              <ConsentCheckItem
                id="weim-consent-personal"
                checked={consentPersonalInfo}
                onChange={setConsentPersonalInfo}
                label={
                  <>
                    <span className="font-semibold text-[#3182F6]">[필수]</span> 개인정보 수집 및
                    이용에 동의합니다.
                  </>
                }
                detail={PERSONAL_INFO_CONSENT_BODY}
              />
              <ConsentCheckItem
                id="weim-consent-unique"
                checked={consentUniqueId}
                onChange={setConsentUniqueId}
                label={
                  <>
                    <span className="font-semibold text-[#3182F6]">[필수]</span> 고유식별정보(주민등록번호)
                    처리에 동의합니다.
                  </>
                }
                detail={UNIQUE_ID_CONSENT_BODY}
              />
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-red-500 font-medium tracking-[-0.02em]">{error}</p>
          )}
          <p className="text-[10px] text-[#D1D5DB] text-center pt-2">sign-postcode-v4</p>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-auto">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-[#3182F6] text-white font-bold text-[16px] py-4 rounded-2xl active:scale-[0.98] shadow-lg shadow-[#3182F6]/25 transition-transform tracking-[-0.02em]"
          >
            다음 — 서명하기
          </button>
        </div>
      </div>
    </div>
  );
}
