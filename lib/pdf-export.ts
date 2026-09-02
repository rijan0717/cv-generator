import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportCVToPDF(
  elementId: string,
  filename = "My_Resume.pdf",
  onProgress?: (status: string) => void
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id '${elementId}' not found.`);
  }

  onProgress?.("Rendering high-resolution canvas...");

  // Capture canvas with 2x scale for crisp, sharp vector-like text rendering
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 1200,
  });

  onProgress?.("Generating PDF document...");

  const imgData = canvas.toDataURL("image/png");
  
  // Standard A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Handle multi-page overflow if CV exceeds standard A4 height
  while (heightLeft > 2) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  onProgress?.("Downloading PDF...");
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function printCV(): void {
  window.print();
}
