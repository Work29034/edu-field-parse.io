import { TARGET_HEADERS, type TargetHeader } from "./constants";
import { computeGradePoints } from "./grade";

export type Row = Record<TargetHeader, string | number | null>;

export function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const HEADER_SYNONYMS: Record<string, TargetHeader> = {
  // Roll Number
  roll: "Roll Number",
  rollno: "Roll Number",
  rollnum: "Roll Number",
  rollnumber: "Roll Number",
  regno: "Roll Number",
  registrationno: "Roll Number",
  htno: "Roll Number", // Hall Ticket Number
  hallticketno: "Roll Number",
  // Student Name
  name: "Student Name",
  student: "Student Name",
  studentname: "Student Name",
  // Class
  class: "Class",
  classname: "Class",
  // Section
  section: "Section",
  sec: "Section",
  // Department
  dept: "Department",
  department: "Department",
  // Year
  year: "Year",
  academicyear: "Year",
  // Semester
  sem: "Semester",
  semester: "Semester",
  // Subject Code
  subjectcode: "Subject Code",
  subcode: "Subject Code",
  code: "Subject Code",
  // Subject Name
  subject: "Subject Name",
  subjectname: "Subject Name",
  subname: "Subject Name",
  // Grade
  grade: "Grade",
  gradeletter: "Grade",
  // Grade Points
  gradepoints: "Grade Points",
  gp: "Grade Points",
  sgpa: "Grade Points",
  // Credits
  credit: "Credits",
  credits: "Credits",
  cr: "Credits",
};

export function buildHeaderMap(headers: string[]) {
  const map: Partial<Record<TargetHeader, string>> = {};
  for (const h of headers) {
    const key = normalize(h);
    // Skip SNO column as it's not needed
    if (key === "sno" || key === "serialno" || key === "serialnumber") {
      continue;
    }
    if (HEADER_SYNONYMS[key]) {
      map[HEADER_SYNONYMS[key]] = h;
    } else {
      for (const target of TARGET_HEADERS) {
        if (normalize(target) === key) {
          map[target] = h;
          break;
        }
      }
    }
  }
  return map;
}

export function getMissingRequiredFields(headerMap: Partial<Record<TargetHeader, string>>): TargetHeader[] {
  const requiredFields: TargetHeader[] = ["Class", "Section", "Department", "Year", "Semester"];
  return requiredFields.filter(field => !headerMap[field]);
}

export function toCsv(rows: Row[]): string {
  const headerLine = TARGET_HEADERS.join(",");
  const lines = rows.map((row) =>
    TARGET_HEADERS.map((h) => {
      const val = row[h] ?? "";
      const s = String(val);
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

export function finalizeRow(row: Partial<Row>, userInputs?: Partial<Row>): Row {
  // Fill Grade Points if missing
  const grade = String((row["Grade"] ?? "")).toUpperCase().trim();
  const gp = String(row["Grade Points"] ?? "").trim();
  if (!gp && grade) {
    (row["Grade Points"]) = computeGradePoints(grade);
  }
  
  const out: Row = {} as any;
  for (const h of TARGET_HEADERS) {
    // Use user inputs for missing required fields, otherwise use row data
    (out as any)[h] = (row as any)[h] ?? (userInputs as any)?.[h] ?? "";
  }
  return out;
}
