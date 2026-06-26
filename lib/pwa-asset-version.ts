/** PWA·파비콘 캐시 무력화 — 아이콘 교체 시 이 값을 올릴 것 */
export const PWA_ASSET_VERSION = "12";

export function pwaAssetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}?v=${PWA_ASSET_VERSION}`;
}
