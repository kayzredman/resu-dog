// Shared PDF generation for resume / cover letter / profile page

const RESUME_SECTIONS = new Set([
  "CONTACT", "SUMMARY", "PROFESSIONAL SUMMARY", "OBJECTIVE",
  "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE",
  "EDUCATION", "SKILLS", "CORE COMPETENCIES",
  "ACHIEVEMENTS", "CERTIFICATIONS", "PROJECTS", "LANGUAGES", "REFERENCES",
]);

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (RESUME_SECTIONS.has(t)) return true;
  return (
    t === t.toUpperCase() &&
    t.length >= 2 &&
    t.length <= 35 &&
    /^[A-Z]/.test(t) &&
    !/^[-•\d@+]/.test(t)
  );
}

function isRoleLine(line: string): boolean {
  const t = line.trim();
  return (
    !isSectionHeader(t) &&
    !/^[-•]/.test(t) &&
    (t.includes("–") || t.includes("—") || /\d{4}\s*[-–]\s*(\d{4}|Till|Present|Current)/i.test(t))
  );
}

export async function downloadPDF(filename: string, content: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ML = 20, MR = 20, MT = 22, MB = 20;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const textW = pageW - ML - MR;
  let y = MT;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - MB) { doc.addPage(); y = MT; }
  };

  const cleaned = content
    .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
    .replace(/\n\{[\s\S]*\}$/, "")
    .trim();

  let firstNameDone = false;

  for (const raw of cleaned.split("\n")) {
    const trimmed = raw.trim();

    if (!trimmed) {
      y += 2;
      continue;
    }

    if (isSectionHeader(trimmed)) {
      if (y > MT + 5) y += 5;
      ensureSpace(12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(trimmed, ML, y);
      y += 1.5;

      doc.setDrawColor(108, 99, 255);
      doc.setLineWidth(0.5);
      doc.line(ML, y, pageW - MR, y);
      y += 5;

      if (trimmed === "CONTACT") firstNameDone = false;
    } else if (!firstNameDone && !trimmed.includes("@") && !trimmed.startsWith("+") && !trimmed.startsWith("http") && trimmed.length < 50) {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(trimmed, ML, y);
      y += 7;
      firstNameDone = true;
    } else if (/^[-•]/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[-•]\s*/, "");
      ensureSpace(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 55, 55);
      doc.text("•", ML + 1, y);
      const wrapped = doc.splitTextToSize(bulletContent, textW - 7) as string[];
      for (const wl of wrapped) {
        ensureSpace(5);
        doc.text(wl, ML + 6, y);
        y += 4.8;
      }
    } else if (isRoleLine(trimmed)) {
      if (y > MT + 5) y += 3;
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(trimmed, textW) as string[];
      for (const wl of wrapped) { ensureSpace(5); doc.text(wl, ML, y); y += 5; }
    } else {
      ensureSpace(5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(65, 65, 65);
      const wrapped = doc.splitTextToSize(trimmed, textW) as string[];
      for (const wl of wrapped) { ensureSpace(5); doc.text(wl, ML, y); y += 4.8; }
    }
  }

  doc.save(filename);
}
