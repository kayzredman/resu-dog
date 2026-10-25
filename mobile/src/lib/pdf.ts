// Turns plain-text resumes and cover letters into a clean, ATS-friendly PDF and opens
// the system share sheet (Save to Files, Drive, Mail, WhatsApp, …).

import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const KNOWN_SECTIONS = new Set([
  'CONTACT', 'SUMMARY', 'PROFESSIONAL SUMMARY', 'OBJECTIVE', 'EXPERIENCE', 'WORK EXPERIENCE',
  'PROFESSIONAL EXPERIENCE', 'EDUCATION', 'SKILLS', 'CORE COMPETENCIES', 'ACHIEVEMENTS',
  'CERTIFICATIONS', 'PROJECTS', 'LANGUAGES', 'REFERENCES',
]);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function isSectionHeader(line: string): boolean {
  if (KNOWN_SECTIONS.has(line)) return true;
  return line === line.toUpperCase() && line.length >= 2 && line.length <= 35 && /^[A-Z]/.test(line);
}

function toHtml(text: string, kind: 'resume' | 'letter'): string {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n');
  let nameDone = kind === 'letter';
  let inList = false;
  const out: string[] = [];

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      out.push('<div class="gap"></div>');
      continue;
    }
    if (!nameDone && !line.includes('@') && line.length < 50 && !/^[-•\d+]/.test(line)) {
      out.push(`<h1>${escapeHtml(line)}</h1>`);
      nameDone = true;
    } else if (kind === 'resume' && isSectionHeader(line)) {
      closeList();
      nameDone = true;
      out.push(`<h2>${escapeHtml(line)}</h2>`);
    } else if (/^[-•]/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.replace(/^[-•]\s*/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();

  // System fonts render any script (accented and non-Latin names included)
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 18mm 18mm; }
    body { font-family: -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #212121; font-size: 10.5pt; line-height: 1.45; }
    h1 { font-size: 18pt; margin: 0 0 6pt; color: #141414; }
    h2 { font-size: 10.5pt; letter-spacing: .06em; margin: 12pt 0 4pt; padding-bottom: 2pt; border-bottom: 1px solid #505050; }
    p { margin: 0 0 2pt; }
    ul { margin: 2pt 0 4pt 14pt; padding: 0; }
    li { margin: 0 0 2pt; }
    .gap { height: 4pt; }
  </style></head><body>${out.join('\n')}</body></html>`;
}

/** "Jane Doe" + resume → "Jane-Doe-Resume.pdf", so the file is recognisable when it's sent. */
function pdfName(text: string, kind: 'resume' | 'letter'): string {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  // Resumes start with the name; letters end with it (after "Sincerely,")
  const candidate = kind === 'resume' ? lines[0] : lines[lines.length - 1];
  const name = (candidate ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
  const suffix = kind === 'resume' ? 'Resume' : 'Cover-Letter';
  return `${name && name.length <= 40 ? `${name}-` : ''}${suffix}.pdf`;
}

export async function shareAsPdf(text: string, kind: 'resume' | 'letter', title: string) {
  // A4 at 72 PPI
  const { uri } = await Print.printToFileAsync({ html: toHtml(text, kind), width: 595, height: 842 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  let shareUri = uri;
  try {
    const named = new File(Paths.cache, pdfName(text, kind));
    if (named.exists) named.delete();
    const printed = new File(uri);
    await printed.move(named);
    shareUri = printed.uri;
  } catch {
    // Keep the generated name if renaming fails — the PDF itself is fine
  }

  await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
