import { cn } from "@/lib/utils";

/** 대시보드 좌우 패딩 — 전체 너비 활용 */
export const DASHBOARD_SHELL_X = "w-full px-4 md:px-8 lg:px-12";

/** 모바일 카드 1개 — 대시보드 리스트 공통 톤앤매너 */
export const MOBILE_CARD_CLASS =
  "bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full min-w-0 max-w-full";

/** 모바일 전용 카드 리스트 (< md) */
export const MOBILE_CARD_LIST_CLASS =
  "flex md:hidden flex-col gap-4 p-4 w-full min-w-0 max-w-full";

/** 중간 폭(md~lg): 카드형 리스트 — 파트너 등 아코디언 UI */
export const COMPACT_CARD_LIST_CLASS =
  "hidden md:flex lg:hidden flex-col gap-3 p-4 w-full min-w-0 max-w-full";

/** 중간 폭(md~lg): Flex/Grid 래핑 데이터 행 리스트 */
export const FLUID_ROW_LIST_CLASS =
  "hidden md:block lg:hidden w-full min-w-0 max-w-full divide-y divide-slate-100 border-t border-slate-100";

/** 넓은 화면(lg+): 테이블만 노출 — 가로 스크롤 없음 */
export const DESKTOP_TABLE_CLASS = "hidden lg:block w-full min-w-0 max-w-full";

/** lg+ 테이블 — table-fixed / min-w-full 사용하지 않음 */
export const DESKTOP_TABLE_EL_CLASS = "w-full max-w-full text-sm";

export const FLUID_ROW_LABEL_CLASS =
  "text-[10px] font-bold text-slate-400 uppercase tracking-wider";

export const MOBILE_CARD_HEADER_CLASS =
  "flex justify-between items-center mb-3 gap-3 min-w-0 max-w-full";

export const MOBILE_CARD_TITLE_CLASS =
  "text-lg font-bold text-slate-900 min-w-0 truncate break-keep";

export const MOBILE_CARD_META_CLASS =
  "text-sm text-gray-500 break-keep min-w-0 max-w-full";

export const MOBILE_CARD_INFO_BOX_CLASS =
  "mt-3 bg-gray-50 p-2 rounded-lg text-sm text-gray-700 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 max-w-full break-keep";

export const MOBILE_CARD_FOOTER_META_CLASS =
  "mt-2 text-xs text-gray-400 break-keep min-w-0";

export const MOBILE_TOGGLE_BTN_CLASS =
  "w-full mt-3 bg-gray-50 py-2 rounded-lg text-sm text-center text-slate-700 font-medium hover:bg-gray-100 transition-colors break-keep";

export function MobileCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(MOBILE_CARD_LIST_CLASS, className)}>{children}</div>;
}

export function CompactCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(COMPACT_CARD_LIST_CLASS, className)}>{children}</div>;
}

export function FluidRowList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(FLUID_ROW_LIST_CLASS, className)}>{children}</div>;
}

export function FluidDataRow({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3.5 w-full max-w-full min-w-0 bg-white hover:bg-gray-50 transition-colors",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/** FluidDataRow 안에서 한 줄(밴드) — basis-full로 줄바꿈 */
export function FluidRowBand({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start sm:items-center gap-x-4 gap-y-2 w-full basis-full min-w-0 max-w-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function FluidRowField({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 min-w-0 max-w-full", className)}>
      {label ? <span className={FLUID_ROW_LABEL_CLASS}>{label}</span> : null}
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}

export function DesktopTableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(DESKTOP_TABLE_CLASS, className)}>{children}</div>;
}

export function MobileCard({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(MOBILE_CARD_CLASS, className)} {...props}>
      {children}
    </div>
  );
}
