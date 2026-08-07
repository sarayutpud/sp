import type { jsPDF } from "jspdf";

/** jsPDF font family name after registerThaiFont. */
export const THAI_PDF_FONT = "Sarabun";

/** Embed Sarabun (Thai + Latin) into a jsPDF document.
 * Font bytes load on demand so app bundles stay smaller until PDF export.
 */
export async function registerThaiFont(doc: jsPDF): Promise<void> {
  const { SARABUN_BOLD_BASE64, SARABUN_REGULAR_BASE64 } = await import(
    "./sarabun-base64"
  );
  doc.addFileToVFS("Sarabun-Regular.ttf", SARABUN_REGULAR_BASE64);
  doc.addFont("Sarabun-Regular.ttf", THAI_PDF_FONT, "normal");
  doc.addFileToVFS("Sarabun-Bold.ttf", SARABUN_BOLD_BASE64);
  doc.addFont("Sarabun-Bold.ttf", THAI_PDF_FONT, "bold");
  doc.setFont(THAI_PDF_FONT, "normal");
}
