export type DaumPostcodeResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
};

type PostcodeCtor = new (options: {
  oncomplete: (data: DaumPostcodeResult) => void;
  width?: string | number;
  height?: string | number;
}) => { open: () => void; embed: (el: HTMLElement) => void };

declare global {
  interface Window {
    daum?: { Postcode: PostcodeCtor };
    kakao?: { Postcode: PostcodeCtor };
  }
}

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

/** 컨테이너에 embed — heightPx 필수 (모바일에서 % 높이는 0px 버그 유발) */
export async function embedDaumAddressSearch(
  container: HTMLElement,
  onComplete: (result: DaumPostcodeResult) => void,
  heightPx: number,
): Promise<void> {
  await loadDaumPostcodeScript();

  const Postcode = getPostcodeConstructor();
  if (!Postcode) {
    throw new Error("주소 검색을 초기화하지 못했습니다.");
  }

  const height = Math.max(320, Math.floor(heightPx));
  container.replaceChildren();
  container.style.width = "100%";
  container.style.height = `${height}px`;
  container.style.minHeight = `${height}px`;
  container.style.overflow = "hidden";

  new Postcode({
    oncomplete: onComplete,
    width: "100%",
    height,
  }).embed(container);
}

export function pickDaumAddressBase(result: DaumPostcodeResult): string {
  return result.roadAddress || result.jibunAddress || result.address || "";
}
