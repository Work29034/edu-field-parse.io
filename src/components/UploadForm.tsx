import React, { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Papa from "papaparse";
import { parsePdfToRows } from "@/lib/pdf";

const TARGET_HEADERS = [
  "Roll Number",
  "Student Name",
  "Class",
  "Section",
  "Department",
  "Year",
  "Semester",
  "Subject Code",
  "Subject Name",
  "Grade",
  "Grade Points",
  "Credits",
] as const;

type TargetHeader = typeof TARGET_HEADERS[number];

type Row = Record<TargetHeader, string | number | null>;

const GRADE_POINTS_MAP: Record<string, number> = {
  "A+": 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
  AB: 0,
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const HEADER_SYNONYMS: Record<string, TargetHeader> = {
  // Roll Number
  roll: "Roll Number",
  rollno: "Roll Number",
  rollnum: "Roll Number",
  rollnumber: "Roll Number",
  regno: "Roll Number",
  registrationno: "Roll Number",
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

function buildHeaderMap(headers: string[]) {
  const map: Partial<Record<TargetHeader, string>> = {};
  for (const h of headers) {
    const key = normalize(h);
    if (HEADER_SYNONYMS[key]) {
      map[HEADER_SYNONYMS[key]] = h;
    } else {
      // direct exact match on normalized target headers
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

function toCsv(rows: Row[]): string {
  const headerLine = TARGET_HEADERS.join(",");
  const lines = rows.map((row) =>
    TARGET_HEADERS.map((h) => {
      const val = row[h] ?? "";
      const s = String(val);
      // escape CSV
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

export default function UploadForm() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [defaultCredits, setDefaultCredits] = useState<number>(3);
  const [downUrl, setDownUrl] = useState<string>("");

  const isPdf = useMemo(() => file?.type === "application/pdf" || (file && file.name.toLowerCase().endsWith(".pdf")), [file]);
  const isCsv = useMemo(() => file?.type === "text/csv" || (file && file.name.toLowerCase().endsWith(".csv")), [file]);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownUrl("");

    if (!file) {
      toast({ title: "No file selected", description: "Please choose a PDF or CSV file.", variant: "destructive" });
      return;
    }

    if (isCsv) {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length) {
        console.error(parsed.errors);
        toast({ title: "CSV parse error", description: parsed.errors[0]?.message || "Check your file format.", variant: "destructive" });
        return;
      }

      const headerMap = buildHeaderMap(parsed.meta.fields || []);

      const rows: Row[] = (parsed.data as any[]).map((row) => {
        const out: Partial<Row> = {};
        for (const target of TARGET_HEADERS) {
          const sourceKey = headerMap[target];
          const raw = sourceKey ? row[sourceKey] : "";
          (out as any)[target] = raw ?? "";
        }
        // Fill Grade Points if missing
        const grade = String((out["Grade"] ?? "")).toUpperCase().trim();
        const gp = String(out["Grade Points"] ?? "").trim();
        if (!gp && grade) {
          (out["Grade Points"]) = GRADE_POINTS_MAP[grade] ?? "";
        }
        // Fill Credits if missing
        const credits = String(out["Credits"] ?? "").trim();
        if (!credits) {
          out["Credits"] = defaultCredits;
        }
        return out as Row;
      });

      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      setDownUrl(url);
      toast({ title: "CSV ready", description: "Your file has been processed.", duration: 2500 });
      return;
    }

    if (isPdf) {
      try {
        const ab = await file.arrayBuffer();
        const rows = await parsePdfToRows(ab, defaultCredits);
        if (!rows.length) {
          toast({ title: "No data found", description: "Could not detect any rows in this PDF. Please try a CSV or a clearer PDF export.", variant: "destructive" });
          return;
        }
        const csv = toCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        setDownUrl(url);
        toast({ title: "CSV ready", description: "Your PDF has been parsed.", duration: 3000 });
      } catch (err) {
        console.error(err);
        toast({ title: "PDF parse failed", description: "There was an issue parsing this PDF.", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Unsupported file", description: "Please upload a .csv or .pdf file.", variant: "destructive" });
  };

  return (
    <Card className="max-w-2xl mx-auto p-6 space-y-6">
      <form onSubmit={handleProcess} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="file" className="text-sm font-medium">Upload PDF or CSV</label>
          <Input id="file" type="file" accept=".pdf,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="credits" className="text-sm">Default Credits (if missing)</label>
            <Input id="credits" type="number" min={0} value={defaultCredits} onChange={(e) => setDefaultCredits(Number(e.target.value))} />
          </div>
          <Button type="submit" className="w-full">Process</Button>
        </div>
      </form>

      {downUrl && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <p className="text-sm">Download processed CSV</p>
          <a href={downUrl} download={`eduparse_${Date.now()}.csv`}>
            <Button variant="outline">Download</Button>
          </a>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Columns enforced: {TARGET_HEADERS.join(", ")}. Grade points auto-filled from mapping.
      </div>
    </Card>
  );
}
