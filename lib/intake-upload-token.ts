import { createHmac, timingSafeEqual } from "crypto";

/** 접수 직후 고객 추가 서류 업로드용 토큰 유효기간 (72시간) */
const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

function getIntakeUploadSecret(): string {
  const secret =
    process.env.INTAKE_UPLOAD_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("ENV_MISSING: INTAKE_UPLOAD_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getIntakeUploadSecret()).update(payload).digest("base64url");
}

/** 접수 완료 직후 고객용 서류 업로드 토큰 발급 */
export function createIntakeUploadToken(leadId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${leadId}.${exp}`;
  return `${payload}.${signPayload(payload)}`;
}

/** leadId·토큰 일치 및 만료 검증 */
export function verifyIntakeUploadToken(leadId: string, token: string): boolean {
  if (!leadId || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenLeadId, expRaw, sig] = parts;
  if (tokenLeadId !== leadId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const payload = `${tokenLeadId}.${expRaw}`;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(signPayload(payload));
    actual = Buffer.from(sig);
  } catch {
    return false;
  }

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
