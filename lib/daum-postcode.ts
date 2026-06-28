export type DaumPostcodeResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
        width?: string | number;
        height?: string | number;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}

const SCRIPT_ID = "daum-postcode-v2";
const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let loadPromise: Promise<void> | null = null;

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 주소 검색을 사용할 수 있습니다."));
  }

  if (window.daum?.Postcode) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.daum?.Postcode) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("주소 검색 스크립트 로드 실패")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("주소 검색 스크립트 로드 실패"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Daum 우편번호 — 전체 화면 레이어(.open). 인앱 브라우저·모바일에서 embed보다 안정적 */
export async function openDaumAddressSearch(
  onComplete: (result: DaumPostcodeResult) => void,
): Promise<void> {
  await loadDaumPostcodeScript();

  if (!window.daum?.Postcode) {
    throw new Error("주소 검색을 초기화하지 못했습니다.");
  }

  new window.daum.Postcode({
    oncomplete: onComplete,
    width: "100%",
    height: "100%",
  }).open();
}

export function pickDaumAddressBase(result: DaumPostcodeResult): string {
  return result.roadAddress || result.jibunAddress || result.address || "";
}
