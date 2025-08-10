import { HEADER_SYNONYMS, Row, finalizeRow, normalize } from "./csv";
import { TARGET_HEADERS } from "./constants";

// pdfjs-dist ESM worker setup for Vite
// We only set workerSrc to a static url to avoid bundler issues.
// pdfjs-dist will fetch it.
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// @ts-ignore - vite will inline the asset url
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc as any;

export async function parsePdfToRows(
  arrayBuffer: ArrayBuffer,
  defaultCredits: number
): Promise<Row[]> {
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content: any = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join("\n");
    fullText += "\n" + pageText;
  }

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Helper to detect key:value lines and map to target header
  function parseKeyVal(line: string): { header?: keyof Row; value?: string } {
    // common separators
    const m = line.match(/^(.*?)[\s]*[:\-–][\s]*(.+)$/);
    if (!m) return {};
    const keyNorm = normalize(m[1] || "");
    const header = (HEADER_SYNONYMS as any)[keyNorm];
    if (!header) return {};
    return { header, value: (m[2] || "").trim() } as any;
  }

  // Context of the current student
  const studentFields = new Set([
    "Roll Number",
    "Student Name",
    "Class",
    "Section",
    "Department",
    "Year",
    "Semester",
  ] as const);
  const subjectFields = new Set([
    "Subject Code",
    "Subject Name",
    "Grade",
    "Grade Points",
    "Credits",
  ] as const);

  let ctx: Partial<Row> = {};
  let subj: Partial<Row> = {};
  const rows: Row[] = [];

  function flushSubject() {
    if (
      Object.keys(subj).length &&
      (subj["Subject Code"] || subj["Subject Name"] || subj["Grade"])
    ) {
      // merge student context
      const merged: Partial<Row> = { ...ctx, ...subj };
      rows.push(finalizeRow(merged, defaultCredits));
      subj = {};
    }
  }

  for (const line of lines) {
    const { header, value } = parseKeyVal(line);
    if (!header || value == null) continue;

    if (studentFields.has(header as any)) {
      // starting a new student? If a new roll appears and we have a pending subject, flush it
      if (header === "Roll Number") {
        flushSubject();
        ctx = { ...ctx, [header]: value };
        continue;
      }
      (ctx as any)[header] = value;
      continue;
    }

    if (subjectFields.has(header as any)) {
      (subj as any)[header] = value;
      // heuristic: if we got a grade, it's likely a full subject row; flush
      if (header === "Grade") {
        flushSubject();
      }
      continue;
    }
  }

  // flush trailing subject
  flushSubject();

  // Fallback: if no rows found, attempt a naive table-like parse by scanning tokens
  if (!rows.length) {
    const text = lines.join(" ");
    const re = /(?:Roll\s*No\.?|Roll\s*Number\s*|Reg\.?\s*No\.?)[^\w]?([A-Za-z0-9\-\/]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const roll = m[1];
      const base: Partial<Row> = { "Roll Number": roll } as any;
      rows.push(finalizeRow(base, defaultCredits));
    }
  }

  // Ensure all rows have defined headers
  return rows.map((r) => {
    const out: any = {};
    for (const h of TARGET_HEADERS) out[h] = (r as any)[h] ?? "";
    return out as Row;
  });
}
