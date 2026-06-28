import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Storage에 파일이 없을 때 ZIP·미리보기용 플레이스홀더 PDF */
export async function generatePlaceholderDocPdf(title: string, customerName: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Dawoom Sanjae - Document Placeholder",
    "",
    `Customer: ${customerName}`,
    `Document: ${title}`,
    "",
    "This document is marked as collected.",
    "The original file has not been uploaded to storage yet.",
  ];
  let y = 780;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 14, font, color: rgb(0.2, 0.2, 0.25) });
    y -= 28;
  }
  return pdf.save();
}
