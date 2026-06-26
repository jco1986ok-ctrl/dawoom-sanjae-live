/** PDF 보정 페이지 — 대시보드 패딩보다 넓게 표시 */
export default function PdfCalibrateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-mx-2 sm:-mx-4 lg:mx-0">{children}</div>;
}
