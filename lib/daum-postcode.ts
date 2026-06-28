export type DaumPostcodeResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
};

type PostcodeCtor = new (options: {
  oncomplete: (data: DaumPostcodeResult) => void;
  onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
  width?: string | number;
  height?: string | number;
}) => { open: () => void; embed: (el: HTMLElement) => void };

declare global {
  interface Window {
    daum?: { Postcode: PostcodeCtor };
    kakao?: { Postcode: PostcodeCtor };
  }
}

/** 공식 권장 CDN (구 t1.daumcdn.net 대체) */
const SCRIPT_SRC = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const SCRIPT_ID = "kakao-postcode-v2";

let loadPromise: Promise<void> | null = null;

function getPostcodeConstructor(): PostcodeCtor | null {
  return window.kakao?.Postcode ?? window.daum?.Postcode ?? null;
}

export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 주소 검색을 사용할 수 있습니다."));
  }

  if (getPostcodeConstructor()) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (getPostcodeConstructor()) resolve();
      else reject(new Error("주소 검색을 초기화하지 못했습니다."));
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (getPostcodeConstructor()) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("주소 검색 스크립트 로드 실패")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("주소 검색 스크립트 로드 실패"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** 전체 화면 컨테이너에 embed — 모바일·인앱 브라우저에서 .open()보다 안정적 */
export async function embedDaumAddressSearch(
  container: HTMLElement,
  onComplete: (result: DaumPostcodeResult) => void,
  onClose?: () => void,
): Promise<void> {
  await loadDaumPostcodeScript();

  const Postcode = getPostcodeConstructor();
  if (!Postcode) {
    throw new Error("주소 검색을 초기화하지 못했습니다.");
  }

  container.replaceChildren();

  new Postcode({
    oncomplete: onComplete,
    onclose: () => onClose?.(),
    width: "100%",
    height: "100%",
  }).embed(container);
}

/** @deprecated embed 방식 권장 */
export async function openDaumAddressSearch(
  onComplete: (result: DaumPostcodeResult) => void,
): Promise<void> {
  await loadDaumPostcodeScript();

  const Postcode = getPostcodeConstructor();
  if (!Postcode) {
    throw new Error("주소 검색을 초기화하지 못했습니다.");
  }

  new Postcode({
    oncomplete: onComplete,
    width: "100%",
    height: "100%",
  }).open();
}

export function pickDaumAddressBase(result: DaumPostcodeResult): string {
  return result.roadAddress || result.jibunAddress || result.address || "";
}
