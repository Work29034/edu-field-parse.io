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
  
  // Split text by pages and parse each page
  const pages = text.split(/Page\s+\d+/);
  
  let rollData: Record<string, any> = {}; // Store roll number data
  let subjectData: Array<any> = []; // Store subject data in order
  
  // Parse first page for student info
  const firstPage = pages[1] || pages[0];
  if (firstPage) {
    // Extract student records from first page
    const lines = firstPage.split(/\s+/).filter(Boolean);
    
    // Look for roll number pattern and extract data
    let i = 0;
    while (i < lines.length) {
      // Look for roll number pattern (like 22B81A1229)
      if (/^[0-9]{2}[A-Z0-9]{8,10}$/.test(lines[i])) {
        const rollNo = lines[i];
        const name = lines[i + 1];
        const studentClass = lines[i + 2];
        const section = lines[i + 3];
        const department = lines[i + 4];
        const year = lines[i + 5];
        const semester = lines[i + 6];
        const subjectCode = lines[i + 7];
        
        if (!rollData[rollNo]) {
          rollData[rollNo] = {
            "Roll Number": rollNo,
            "Student Name": name,
            "Class": studentClass,
            "Section": section,
            "Department": department,
            "Year": year,
            "Semester": semester,
            subjects: []
          };
        }
        
        rollData[rollNo].subjects.push({ "Subject Code": subjectCode });
        i += 8;
      } else {
        i++;
      }
    }
  }
  
  // Parse second page for subject details
  const secondPage = pages[2];
  if (secondPage) {
    const lines = secondPage.split(/\s+/).filter(Boolean);
    let subjectIndex = 0;
    
    let i = 0;
    while (i < lines.length) {
      // Look for subject name followed by grade and credits
      if (i + 2 < lines.length) {
        const subjectName = lines[i];
        const grade = lines[i + 1];
        const credits = lines[i + 2];
        
        // Validate grade pattern (A+, A, B, C, D, E, F, AB)
        if (/^(A\+|A|B|C|D|E|F|AB)$/.test(grade) && /^\d+$/.test(credits)) {
          subjectData.push({
            "Subject Name": subjectName,
            "Grade": grade,
            "Credits": credits
          });
          i += 3;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
  }
  
  // Combine student data with subject data
  const rollNumbers = Object.keys(rollData);
  let subjectDataIndex = 0;
  
  for (const rollNo of rollNumbers) {
    const student = rollData[rollNo];
    
    for (let j = 0; j < student.subjects.length; j++) {
      if (subjectDataIndex < subjectData.length) {
        const row: Partial<Row> = {
          "Roll Number": student["Roll Number"],
          "Student Name": student["Student Name"],
          "Class": student["Class"],
          "Section": student["Section"],
          "Department": student["Department"],
          "Year": student["Year"],
          "Semester": student["Semester"],
          "Subject Code": student.subjects[j]["Subject Code"],
          "Subject Name": subjectData[subjectDataIndex]["Subject Name"],
          "Grade": subjectData[subjectDataIndex]["Grade"],
          "Credits": subjectData[subjectDataIndex]["Credits"]
        };
        
        rows.push(finalizeRow(row));
        subjectDataIndex++;
      }
    }
  }
  
  console.log("Parsed tabular rows:", rows);
  return rows;
}

function parseByPatterns(text: string): Row[] {
  const rows: Row[] = [];
  
  // Look for HTNO/Roll numbers followed by other data
  const htnoPattern = /\b([A-Z0-9]{8,12})\b/g;
  const gradePattern = /\b(A\+|A|B|C|D|E|F|AB)\b/g;
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
