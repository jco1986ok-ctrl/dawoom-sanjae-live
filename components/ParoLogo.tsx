type ParoLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function ParoLogo({ size = 40, className = "", priority = false }: ParoLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/paro-logo.png"
      alt="업무상 질병 산재 지킴이 파로"
      width={size}
      height={size}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block shrink-0 object-contain aspect-square bg-transparent ${className}`}
    />
  );
}

export const PARO_GREETING = "업무상 질병 산재 지킴이 파로입니다! 🦉";
