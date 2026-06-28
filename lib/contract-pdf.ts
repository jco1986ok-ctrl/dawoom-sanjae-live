import fs from "fs/promises";
import path from "path";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  getPdfLayouts,
  type DaeriLayout,
  type PdfLayouts,
  type WeimLayout,
  type YakjungLayout,
} from "./pdf-layout-server.ts";

export type {
  DaeriLayout,
  PdfLayouts,
  WeimLayout,
  YakjungLayout,
} from "./pdf-layout-shared";
export { getPdfLayouts, loadPdfLayoutsFromDisk, SAMPLE_PDF_FIELDS } from "./pdf-layout-server.ts";

export interface ContractPdfFields {
  name: string;
  phone: string;
  address: string;
  addressBase: string;
  addressDetail: string;
  zonecode: string;
  residentNumber: string;
  residentNumberFront: string;
  residentNumberBackFirst: string;
  genderLabel: string;
}

interface DrawContext {
  page: PDFPage;
  font: PDFFont;
  fields: ContractPdfFields;
  signatureImage?: PDFImage;
}

const FONT_CANDIDATES = ["nanum.ttf", "NanumBarunGothic.ttf"] as const;
const TEMPLATE_FILES = ["weim", "daeri", "yakjung"] as const;
type TemplateName = (typeof TEMPLATE_FILES)[number];

type TextSlot = { x: number; y: number; size?: number };

type MultilineSlot = {
  x: number;
  y: number;
  lineHeight: number;
  maxWidth: number;
  maxLines: number;
  size?: number;
};

interface DrawBundle {
  weim: WeimLayout;
  daeri: DaeriLayout;
  yakjung: YakjungLayout;
}

const DEFAULT_FONT_SIZE = 10;

/** @deprecated config/pdf-layouts.json 사용 — 하위 호환 re-export */
export async function getWeimLayout() {
  return (await getPdfLayouts()).weim;
}
export async function getDaeriLayout() {
  return (await getPdfLayouts()).daeri;
}
export async function getYakjungLayout() {
  return (await getPdfLayouts()).yakjung;
}

let cachedFontBytes: Uint8Array | null = null;
let cachedFontFileName: string | null = null;

export class ContractPdfAssetError extends Error {
  readonly missingFiles: string[];

  constructor(message: string, missingFiles: string[]) {
    super(message);
    this.name = "ContractPdfAssetError";
    this.missingFiles = missingFiles;
  }
}

function publicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function validateContractPdfAssets(): Promise<void> {
  const missing: string[] = [];
  let fontFound = false;
  for (const fontFile of FONT_CANDIDATES) {
    if (await fileExists(publicPath(fontFile))) {
      fontFound = true;
      break;
    }
  }
  if (!fontFound) missing.push(...FONT_CANDIDATES.map((f) => `public/${f}`));
  for (const template of TEMPLATE_FILES) {
    if (!(await fileExists(publicPath(`${template}.pdf`)))) {
      missing.push(`public/${template}.pdf`);
    }
  }
  if (missing.length > 0) {
    throw new ContractPdfAssetError(
      `PDF 합성에 필요한 파일이 없습니다: ${missing.join(", ")}`,
      missing,
    );
  }
}

async function loadKoreanFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  for (const fontFile of FONT_CANDIDATES) {
    const fontPath = publicPath(fontFile);
    if (await fileExists(fontPath)) {
      cachedFontBytes = await fs.readFile(fontPath);
      cachedFontFileName = fontFile;
      return cachedFontBytes;
    }
  }
  throw new ContractPdfAssetError(
    `한글 폰트를 찾을 수 없습니다.`,
    FONT_CANDIDATES.map((f) => `public/${f}`),
  );
}

export function getLoadedFontFileName(): string | null {
  return cachedFontFileName;
}

function genderFromResidentBack(digit: string): string {
  const d = parseInt(digit, 10);
  if ([1, 3, 5, 7, 9].includes(d)) return "남";
  if ([2, 4, 6, 8, 0].includes(d)) return "여";
  return "";
}

function getDateParts(date = new Date()) {
  return {
    yearFull: String(date.getFullYear()),
    yearShort: String(date.getFullYear()).slice(-2),
    monthPadded: String(date.getMonth() + 1).padStart(2, "0"),
    monthPlain: String(date.getMonth() + 1),
    dayPadded: String(date.getDate()).padStart(2, "0"),
    dayPlain: String(date.getDate()),
  };
}

function parseBase64Image(dataUrl: string): { bytes: Uint8Array; mime: "png" | "jpeg" } {
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return { bytes: Uint8Array.from(Buffer.from(base64, "base64")), mime: "png" };
  }
  const mime = match[1].toLowerCase().startsWith("j") ? "jpeg" : "png";
  return { bytes: Uint8Array.from(Buffer.from(match[2], "base64")), mime };
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signatureBase64: string,
): Promise<PDFImage> {
  const { bytes, mime } = parseBase64Image(signatureBase64);
  return mime === "jpeg" ? pdfDoc.embedJpg(bytes) : pdfDoc.embedPng(bytes);
}

function drawText(
  ctx: DrawContext,
  text: string,
  x: number,
  y: number,
  size = DEFAULT_FONT_SIZE,
) {
  if (!text.trim()) return;
  ctx.page.drawText(text, { x, y, size, font: ctx.font });
}

function drawSlot(ctx: DrawContext, text: string, slot: TextSlot) {
  drawText(ctx, text, slot.x, slot.y, slot.size ?? DEFAULT_FONT_SIZE);
}

function measureWidth(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

/** 한글 포함 문자열 — maxWidth 내에서 2~3줄 wrap */
export function wrapTextLines(
  font: PDFFont,
  text: string,
  maxWidth: number,
  maxLines: number,
  size: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  const pushLine = (line: string) => {
    if (line.trim()) lines.push(line.trim());
  };

  const flushByChar = (chunk: string) => {
    let buf = "";
    for (const ch of chunk) {
      const next = buf + ch;
      if (measureWidth(font, next, size) <= maxWidth) {
        buf = next;
      } else {
        if (buf) pushLine(buf);
        buf = ch;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (buf && lines.length < maxLines) pushLine(buf);
  };

  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token;
    if (measureWidth(font, candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        pushLine(current);
        current = "";
      }
      if (measureWidth(font, token, size) <= maxWidth) {
        current = token;
      } else {
        flushByChar(token);
      }
    }
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) pushLine(current);

  if (lines.length === 0) flushByChar(trimmed);
  return lines.slice(0, maxLines);
}

/** addressBase + detail 우선, 없으면 자동 wrap */
export function resolveAddressLines(
  font: PDFFont,
  fields: ContractPdfFields,
  slot: MultilineSlot,
): string[] {
  const size = slot.size ?? DEFAULT_FONT_SIZE;
  const base = fields.addressBase.trim();
  const detail = fields.addressDetail.trim();

  if (base && detail) {
    const lines = [base, detail];
    if (measureWidth(font, base, size) > slot.maxWidth) {
      return wrapTextLines(font, fields.address, slot.maxWidth, slot.maxLines, size);
    }
    if (lines.length <= slot.maxLines) return lines;
  }

  return wrapTextLines(
    font,
    fields.address || [base, detail].filter(Boolean).join(" "),
    slot.maxWidth,
    slot.maxLines,
    size,
  );
}

function drawMultiline(
  ctx: DrawContext,
  lines: string[],
  slot: MultilineSlot,
) {
  const size = slot.size ?? DEFAULT_FONT_SIZE;
  lines.slice(0, slot.maxLines).forEach((line, index) => {
    drawText(ctx, line, slot.x, slot.y - index * slot.lineHeight, size);
  });
}

type DateSlotGroup = {
  year: TextSlot;
  month: TextSlot;
  day: TextSlot;
  fullYear?: boolean;
  plainMonthDay?: boolean;
};

function drawDateSlots(ctx: DrawContext, slots: DateSlotGroup, date = new Date()) {
  const parts = getDateParts(date);
  const year = slots.fullYear ? parts.yearFull : parts.yearShort;
  const month = slots.plainMonthDay ? parts.monthPlain : parts.monthPadded;
  const day = slots.plainMonthDay ? parts.dayPlain : parts.dayPadded;
  drawSlot(ctx, year, slots.year);
  drawSlot(ctx, month, slots.month);
  drawSlot(ctx, day, slots.day);
}

function drawSignature(
  ctx: DrawContext,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!ctx.signatureImage) return;
  ctx.page.drawImage(ctx.signatureImage, { x, y, width, height });
}

function drawWeim(ctx: DrawContext, L: WeimLayout) {
  const { fields } = ctx;

  drawDateSlots(ctx, L.date);
  drawSlot(ctx, fields.name, L.name);
  drawMultiline(ctx, resolveAddressLines(ctx.font, fields, L.address), L.address);
  drawSlot(ctx, fields.residentNumber, L.residentNumber);
  drawSlot(ctx, fields.phone, L.phone);
  drawSignature(ctx, L.signature.x, L.signature.y, L.signature.width, L.signature.height);
}

function drawDaeri(ctx: DrawContext, L: DaeriLayout) {
  const { fields } = ctx;

  drawSlot(ctx, fields.name, L.nameTop);
  drawSlot(ctx, fields.residentNumberFront, L.birthDate);
  drawSlot(ctx, fields.genderLabel, L.gender);
  if (fields.zonecode) drawSlot(ctx, fields.zonecode, L.zonecode);
  drawMultiline(ctx, resolveAddressLines(ctx.font, fields, L.address), L.address);
  drawSlot(ctx, fields.phone, L.phone);
  drawDateSlots(ctx, L.date);
  drawSlot(ctx, fields.name, L.nameBottom);
  drawSignature(ctx, L.signature.x, L.signature.y, L.signature.width, L.signature.height);
}

function drawYakjung(ctx: DrawContext, L: YakjungLayout) {
  const { fields } = ctx;

  drawSlot(ctx, fields.name, L.name);
  drawSlot(ctx, fields.residentNumber, L.residentNumber);
  drawMultiline(ctx, resolveAddressLines(ctx.font, fields, L.address), L.address);
  drawSlot(ctx, fields.phone, L.phone);
  drawText(ctx, L.retainerFee.value, L.retainerFee.x, L.retainerFee.y, L.retainerFee.size);
  drawText(ctx, L.successFee.value, L.successFee.x, L.successFee.y, L.successFee.size);
  drawDateSlots(ctx, L.date);
  drawSlot(ctx, fields.name, L.nameSign);
  drawSignature(ctx, L.signature.x, L.signature.y, L.signature.width, L.signature.height);
}

async function loadTemplatePdfBytes(template: TemplateName): Promise<Uint8Array> {
  const templatePath = publicPath(`${template}.pdf`);
  if (!(await fileExists(templatePath))) {
    throw new ContractPdfAssetError(
      `원본 PDF가 없습니다: public/${template}.pdf`,
      [`public/${template}.pdf`],
    );
  }
  return fs.readFile(templatePath);
}

async function fillTemplatePdf(
  template: TemplateName,
  fields: ContractPdfFields,
  signatureBase64: string,
  fontBytes: Uint8Array,
  layouts: DrawBundle,
): Promise<PDFDocument> {
  const templateBytes = await loadTemplatePdfBytes(template);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);
  const signatureImage = await embedSignatureImage(pdfDoc, signatureBase64);
  const page = pdfDoc.getPages()[0];
  if (!page) throw new Error(`${template}.pdf에 페이지가 없습니다.`);

  const ctx: DrawContext = { page, font, fields, signatureImage };
  if (template === "weim") drawWeim(ctx, layouts.weim);
  else if (template === "daeri") drawDaeri(ctx, layouts.daeri);
  else drawYakjung(ctx, layouts.yakjung);

  return pdfDoc;
}

export async function generateMergedContractPdf(
  fields: ContractPdfFields,
  signatureBase64: string,
  layoutOverrides?: Partial<PdfLayouts>,
): Promise<Uint8Array> {
  await validateContractPdfAssets();
  const fontBytes = await loadKoreanFontBytes();
  const layouts = await getPdfLayouts(layoutOverrides);
  const mergedDoc = await PDFDocument.create();
  mergedDoc.registerFontkit(fontkit);

  for (const template of TEMPLATE_FILES) {
    const filledDoc = await fillTemplatePdf(
      template,
      fields,
      signatureBase64,
      fontBytes,
      layouts,
    );
    const [page] = await mergedDoc.copyPages(filledDoc, [0]);
    mergedDoc.addPage(page);
  }

  return mergedDoc.save();
}

export async function generateSingleTemplatePdf(
  template: TemplateName,
  fields: ContractPdfFields,
  signatureBase64: string,
  layoutOverrides?: Partial<PdfLayouts>,
): Promise<Uint8Array> {
  await validateContractPdfAssets();
  const fontBytes = await loadKoreanFontBytes();
  const layouts = await getPdfLayouts(layoutOverrides);
  const doc = await fillTemplatePdf(
    template,
    fields,
    signatureBase64,
    fontBytes,
    layouts,
  );
  return doc.save();
}

export async function saveContractPdfLocally(
  pdfBytes: Uint8Array,
  filename: string,
): Promise<string> {
  const dir = path.join(process.cwd(), ".tmp", "contracts");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, pdfBytes);
  return filePath;
}

export function buildContractPdfFields(input: {
  name: string;
  phone: string;
  address: string;
  addressBase?: string;
  addressDetail?: string;
  zonecode?: string;
  residentNumberFront: string;
  residentNumberBack: string;
}): ContractPdfFields {
  const front = input.residentNumberFront.replace(/[^\d]/g, "").trim();
  const back = input.residentNumberBack.replace(/[^\d]/g, "").trim();
  const addressBase = (input.addressBase ?? "").trim();
  const addressDetail = (input.addressDetail ?? "").trim();
  const address =
    input.address.trim() ||
    [addressBase, addressDetail].filter(Boolean).join(" ");

  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    address,
    addressBase,
    addressDetail,
    zonecode: (input.zonecode ?? "").trim(),
    residentNumber: `${front}-${back}`,
    residentNumberFront: front,
    residentNumberBackFirst: back.charAt(0),
    genderLabel: genderFromResidentBack(back.charAt(0)),
  };
}
