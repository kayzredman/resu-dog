// Shared DOCX generation for resume download

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from "docx";
import { saveAs } from "file-saver";

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

export async function downloadDOCX(filename: string, content: string) {
  const cleaned = content
    .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
    .replace(/\n\{[\s\S]*\}$/, "")
    .trim();

  const children: Paragraph[] = [];
  let firstNameDone = false;

  for (const raw of cleaned.split("\n")) {
    const trimmed = raw.trim();

    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }

    if (isSectionHeader(trimmed)) {
      firstNameDone = true;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "505050" },
          },
          children: [
            new TextRun({ text: trimmed, bold: true, size: 22, font: "Calibri", color: "1e1e1e" }),
          ],
        })
      );
    } else if (!firstNameDone && !trimmed.includes("@") && !trimmed.startsWith("+") && !trimmed.startsWith("http") && trimmed.length < 50) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
          children: [
            new TextRun({ text: trimmed, bold: true, size: 36, font: "Calibri", color: "141414" }),
          ],
        })
      );
      firstNameDone = true;
    } else if (/^[-•]/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[-•]\s*/, "");
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: bulletContent, size: 20, font: "Calibri", color: "212121" }),
          ],
        })
      );
    } else if (isRoleLine(trimmed)) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: trimmed, bold: true, size: 20, font: "Calibri", color: "212121" }),
          ],
        })
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: trimmed, size: 20, font: "Calibri", color: "212121" }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
