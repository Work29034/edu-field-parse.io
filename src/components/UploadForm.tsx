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
  const [downUrl, setDownUrl] = useState<string>("");
  
  // Auto-set credits to 3 (removed user input)
  const defaultCredits = 3;

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
    <div className="w-full max-w-2xl mx-auto">
      {/* Hero Card */}
      <Card className="relative overflow-hidden bg-gradient-primary shadow-primary border-0 p-8 mb-8">
        <div className="relative z-10 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-2">Transform Your Academic Data</h2>
          <p className="text-primary-foreground/90">Upload PDF or CSV files and get standardized CSV output</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90" />
      </Card>

      {/* Upload Form Card */}
      <Card className="p-8 shadow-card border bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleProcess} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="file" className="text-base font-semibold text-foreground">
              Choose File
            </label>
            <div className="relative">
              <Input 
                id="file" 
                type="file" 
                accept=".pdf,.csv" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-14 text-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Supports PDF and CSV files • Grade points auto-calculated • Credits set to 3
            </p>
          </div>

          <Button 
            type="submit" 
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02]"
            disabled={!file}
          >
            {file ? "Process File" : "Select a file to continue"}
          </Button>
        </form>

        {downUrl && (
          <div className="mt-8 p-6 rounded-lg bg-gradient-secondary border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">File Ready!</h3>
                <p className="text-sm text-muted-foreground">Your processed CSV is ready for download</p>
              </div>
              <a href={downUrl} download={`eduparse_${Date.now()}.csv`}>
                <Button variant="outline" size="lg" className="shadow-card hover:shadow-primary transition-all duration-300">
                  Download CSV
                </Button>
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium text-foreground mb-2">Auto-processed columns:</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {TARGET_HEADERS.join(" • ")}
          </p>
        </div>
      </Card>
    </div>
  );
}
