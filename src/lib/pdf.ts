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
  arrayBuffer: ArrayBuffer
): Promise<Row[]> {
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content: any = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ");
    fullText += " " + pageText;
  }

  console.log("PDF Full Text:", fullText);

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // First try to find tabular data by looking for header patterns
  const headerPatterns = [
    /\b(?:SNO|S\.?NO|SERIAL)\b/i,
    /\b(?:HTNO|HALL\s*TICKET|ROLL\s*NO|ROLL\s*NUMBER)\b/i,
    /\b(?:SUBCODE|SUB\s*CODE|SUBJECT\s*CODE)\b/i,
    /\b(?:SUBNAME|SUB\s*NAME|SUBJECT\s*NAME|SUBJECT)\b/i,
    /\b(?:GRADE|GRD)\b/i,
    /\b(?:CREDITS|CR)\b/i
  ];

  // Try to parse as tabular data first
  const tabularRows = parseTabularData(fullText);
  if (tabularRows.length > 0) {
    console.log("Found tabular data:", tabularRows);
    return tabularRows.map(row => {
      const out: any = {};
      for (const h of TARGET_HEADERS) out[h] = row[h] ?? "";
      return out as Row;
    });
  }

  // Fallback to key-value parsing
  return parseKeyValueData(lines);
}

function parseTabularData(text: string): Row[] {
  const rows: Row[] = [];
  
  // Split by common separators and try to identify columns
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Look for header line
  let headerLine = "";
  let dataStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(?:SNO|HTNO|SUBCODE|SUBNAME|GRADE|CREDITS)\b/i.test(line)) {
      headerLine = line;
      dataStartIndex = i + 1;
      break;
    }
  }

  if (!headerLine || dataStartIndex === -1) {
    // Try to find data by patterns
    return parseByPatterns(text);
  }

  console.log("Header line found:", headerLine);
  
  // Parse header to determine column positions
  const headerWords = headerLine.split(/\s+/);
  const columnMap: Record<string, number> = {};
  
  headerWords.forEach((word, index) => {
    const normalized = normalize(word);
    if (HEADER_SYNONYMS[normalized]) {
      columnMap[HEADER_SYNONYMS[normalized]] = index;
    }
  });

  console.log("Column mapping:", columnMap);

  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    
    const values = line.split(/\s+/);
    const row: Partial<Row> = {};
    
    // Map values to columns
    Object.entries(columnMap).forEach(([targetHeader, colIndex]) => {
      if (values[colIndex]) {
        (row as any)[targetHeader] = values[colIndex];
      }
    });

    // Skip SNO column and ensure we have meaningful data
    if (row["Roll Number"] || row["Subject Code"] || row["Subject Name"]) {
      rows.push(finalizeRow(row));
    }
  }

  return rows;
}

function parseByPatterns(text: string): Row[] {
  const rows: Row[] = [];
  
  // Look for HTNO/Roll numbers followed by other data
  const htnoPattern = /\b([A-Z0-9]{8,12})\b/g;
  const gradePattern = /\b([A-F][+]?|AB)\b/g;
  const subjectCodePattern = /\b([A-Z]{2,4}[0-9]{3,4}[A-Z]?)\b/g;
  
  let match;
  const htnoMatches = [];
  
  // Find all potential HTNOs
  while ((match = htnoPattern.exec(text)) !== null) {
    htnoMatches.push({ value: match[1], index: match.index });
  }

  console.log("Found potential HTNOs:", htnoMatches);

  // For each HTNO, try to find associated data
  htnoMatches.forEach(htnoMatch => {
    const startPos = htnoMatch.index;
    const endPos = Math.min(startPos + 200, text.length); // Look ahead 200 chars
    const segment = text.substring(startPos, endPos);
    
    const subCodeMatch = subjectCodePattern.exec(segment);
    const gradeMatch = gradePattern.exec(segment);
    
    if (subCodeMatch || gradeMatch) {
      const row: Partial<Row> = {
        "Roll Number": htnoMatch.value
      };
      
      if (subCodeMatch) {
        row["Subject Code"] = subCodeMatch[1];
      }
      
      if (gradeMatch) {
        row["Grade"] = gradeMatch[1];
      }
      
      rows.push(finalizeRow(row));
    }
  });

  return rows;
}

function parseKeyValueData(lines: string[]): Row[] {
  // Helper to detect key:value lines and map to target header
  function parseKeyVal(line: string): { header?: keyof Row; value?: string } {
    const m = line.match(/^(.*?)[\s]*[:\-–][\s]*(.+)$/);
    if (!m) return {};
    const keyNorm = normalize(m[1] || "");
    const header = (HEADER_SYNONYMS as any)[keyNorm];
    if (!header) return {};
    return { header, value: (m[2] || "").trim() } as any;
  }

  const studentFields = new Set([
    "Roll Number", "Student Name", "Class", "Section", "Department", "Year", "Semester"
  ] as const);
  const subjectFields = new Set([
    "Subject Code", "Subject Name", "Grade", "Grade Points", "Credits"
  ] as const);

  let ctx: Partial<Row> = {};
  let subj: Partial<Row> = {};
  const rows: Row[] = [];

  function flushSubject() {
    if (Object.keys(subj).length && (subj["Subject Code"] || subj["Subject Name"] || subj["Grade"])) {
      const merged: Partial<Row> = { ...ctx, ...subj };
      rows.push(finalizeRow(merged));
      subj = {};
    }
  }

  for (const line of lines) {
    const { header, value } = parseKeyVal(line);
    if (!header || value == null) continue;

    if (studentFields.has(header as any)) {
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
      if (header === "Grade") {
        flushSubject();
      }
      continue;
    }
  }

  flushSubject();

  // Ensure all rows have defined headers
  return rows.map((r) => {
    const out: any = {};
    for (const h of TARGET_HEADERS) out[h] = (r as any)[h] ?? "";
    return out as Row;
  });
}
