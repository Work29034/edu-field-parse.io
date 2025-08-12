import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, Table, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parsePdfToRows } from "@/lib/pdf";
import { buildHeaderMap, toCsv, finalizeRow, getMissingRequiredFields, type Row } from "@/lib/csv";
import { TARGET_HEADERS, type TargetHeader } from "@/lib/constants";
import Papa from "papaparse";

const UploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [downUrl, setDownUrl] = useState("");
  const [missingFields, setMissingFields] = useState<TargetHeader[]>([]);
  const [userInputs, setUserInputs] = useState<Partial<Row>>({});
  const [showInputs, setShowInputs] = useState(false);
  const [pendingData, setPendingData] = useState<Row[] | null>(null);
  const [detectedSubjects, setDetectedSubjects] = useState<string[]>([]);
  const [creditsInput, setCreditsInput] = useState<Record<string, string>>({});
  const [needsCreditsInput, setNeedsCreditsInput] = useState(false);
  const { toast } = useToast();

  const isPdf = useMemo(() => file?.type === "application/pdf" || (file && file.name.toLowerCase().endsWith(".pdf")), [file]);
  const isCsv = useMemo(() => file?.type === "text/csv" || (file && file.name.toLowerCase().endsWith(".csv")), [file]);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      let rows: Row[] = [];
      let headerMap: Partial<Record<TargetHeader, string>> = {};

      if (isCsv) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        const data = result.data as Record<string, string>[];
        
        if (data.length === 0) {
          toast({
            title: "Error",
            description: "No data found in CSV file",
            variant: "destructive",
          });
          return;
        }

        const headers = Object.keys(data[0]);
        headerMap = buildHeaderMap(headers);
        
        const missing = getMissingRequiredFields(headerMap);
        if (missing.length > 0) {
          setMissingFields(missing);
          setShowInputs(true);
          setPendingData(data
            .filter(row => Object.values(row).some(val => val?.toString().trim()))
            .map(row => {
              const mappedRow: Partial<Row> = {};
              for (const [target, original] of Object.entries(headerMap)) {
                if (original && row[original] !== undefined) {
                  mappedRow[target as keyof Row] = row[original];
                }
              }
              return finalizeRow(mappedRow);
            }));
          return;
        }

        rows = data
          .filter(row => Object.values(row).some(val => val?.toString().trim()))
          .map(row => {
            const mappedRow: Partial<Row> = {};
            for (const [target, original] of Object.entries(headerMap)) {
              if (original && row[original] !== undefined) {
                mappedRow[target as keyof Row] = row[original];
              }
            }
            return finalizeRow(mappedRow);
          });
      } else if (isPdf) {
        // Parse PDF
        const arrayBuffer = await file.arrayBuffer();
        const result = await parsePdfToRows(arrayBuffer);
        
        if (result.rows.length === 0) {
          toast({
            title: "Error",
            description: "No valid data found in the PDF file",
            variant: "destructive",
          });
          return;
        }

        // Check if subjects were detected but credits are missing
        if (result.detectedSubjects && result.detectedSubjects.length > 0) {
          const hasCredits = result.rows.some(row => row["Credits"] && String(row["Credits"]).trim() !== "");
          if (!hasCredits) {
            setDetectedSubjects(result.detectedSubjects);
            setPendingData(result.rows);
            setNeedsCreditsInput(true);
            return;
          }
        }

        // Check if required fields are missing from PDF data
        const sampleRow = result.rows[0];
        const availableFields = TARGET_HEADERS.filter(field => 
          sampleRow[field] && String(sampleRow[field]).trim() !== ""
        );
        const missing = TARGET_HEADERS.filter(field => 
          ["Class", "Section", "Department", "Year", "Semester"].includes(field) && 
          !availableFields.includes(field)
        ) as TargetHeader[];

        if (missing.length > 0) {
          setMissingFields(missing);
          setShowInputs(true);
          setPendingData(result.rows);
          return;
        }

        rows = result.rows;
      }

      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "No valid data found in the uploaded file",
          variant: "destructive",
        });
        return;
      }

      // Create CSV and download
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      setDownUrl(url);

      toast({
        title: "Success!",
        description: `Processed ${rows.length} rows successfully`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleUserInputSubmit = () => {
    if (!pendingData) return;

    try {
      const rows = pendingData.map(row => finalizeRow(row, userInputs));
      
      // Create CSV and download
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      setDownUrl(url);

      // Reset state
      setShowInputs(false);
      setMissingFields([]);
      setUserInputs({});
      setPendingData(null);

      toast({
        title: "Success!",
        description: `Processed ${rows.length} rows successfully`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process data with user inputs.",
        variant: "destructive",
      });
    }
  };

  const handleCreditsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pendingData) return;
    
    // Apply credits to pending data
    const updatedRows = pendingData.map(row => ({
      ...row,
      "Credits": creditsInput[String(row["Subject Name"])] || ""
    }));
    
    // Check for missing required fields
    const sampleRow = updatedRows[0];
    if (sampleRow) {
      const availableFields = TARGET_HEADERS.filter(field => 
        sampleRow[field] && String(sampleRow[field]).trim() !== ""
      );
      const missing = TARGET_HEADERS.filter(field => 
        ["Class", "Section", "Department", "Year", "Semester"].includes(field) && 
        !availableFields.includes(field)
      ) as TargetHeader[];
      
      if (missing.length > 0) {
        setMissingFields(missing);
        setPendingData(updatedRows);
        setNeedsCreditsInput(false);
        setShowInputs(true);
        return;
      }
    }
    
    // Generate final CSV
    const finalRows = updatedRows.map(row => finalizeRow(row));
    const csv = toCsv(finalRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    setDownUrl(url);
    
    // Reset state
    setNeedsCreditsInput(false);
    setDetectedSubjects([]);
    setCreditsInput({});
    setPendingData(null);
    
    toast({
      title: "Success!",
      description: `Processed ${finalRows.length} rows successfully`,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Hero Card */}
      <Card className="relative overflow-hidden bg-gradient-primary shadow-primary border-0 p-8">
        <div className="relative z-10 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold mb-2">Transform Your Academic Data</h2>
          <p className="text-primary-foreground/90">Upload PDF or CSV files and get standardized CSV output with auto-calculated grade points</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90" />
      </Card>

      {/* Upload Form Card */}
      <Card className="p-8 shadow-card border bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleProcess} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="file" className="text-base font-semibold text-foreground flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Choose File
            </Label>
            <div className="relative">
              <Input 
                id="file" 
                type="file" 
                accept=".pdf,.csv" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="h-14 text-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Supports PDF and CSV files • Grade points auto-calculated • Handles HTNO, SUBCODE, SUBNAME formats
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2"
            disabled={!file}
          >
            {file ? (
              <>
                <Table className="h-5 w-5" />
                Process File
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              "Select a file to continue"
            )}
          </Button>
        </form>

        {showInputs && (
          <Card className="border-warning/20 bg-warning/5 mt-6">
            <CardHeader>
              <CardTitle className="text-warning flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Missing Required Information
              </CardTitle>
              <CardDescription>
                Please provide the following information to complete the CSV file:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {missingFields.map(field => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{field}</Label>
                  <Input
                    id={field}
                    placeholder={`Enter ${field}`}
                    value={userInputs[field] || ""}
                    onChange={(e) => setUserInputs(prev => ({
                      ...prev,
                      [field]: e.target.value
                    }))}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleUserInputSubmit}
                  disabled={missingFields.some(field => !userInputs[field])}
                  className="flex-1"
                >
                  Generate CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowInputs(false);
                    setMissingFields([]);
                    setUserInputs({});
                    setPendingData(null);
                    setNeedsCreditsInput(false);
                    setDetectedSubjects([]);
                    setCreditsInput({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credits Input Form */}
        {needsCreditsInput && detectedSubjects.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 mt-6">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Table className="h-5 w-5" />
                Detected Subjects - Please Provide Credits
              </CardTitle>
              <CardDescription>
                Enter the credit hours for each detected subject:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreditsSubmit} className="space-y-4">
                {detectedSubjects.map((subject, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 items-center">
                    <Label className="font-medium">{subject}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Enter credits"
                      value={creditsInput[subject] || ""}
                      onChange={(e) => setCreditsInput(prev => ({
                        ...prev,
                        [subject]: e.target.value
                      }))}
                      required
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Continue with Credits
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setNeedsCreditsInput(false);
                      setDetectedSubjects([]);
                      setCreditsInput({});
                      setPendingData(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {downUrl && (
          <Card className="border-success/20 bg-success/5 mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-success font-medium">File processed successfully!</span>
              </div>
              <a
                href={downUrl}
                download="processed_data.csv"
                className="inline-flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </a>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Table className="h-4 w-4" />
            Auto-processed columns:
          </h4>
          <div className="flex flex-wrap gap-1">
            {TARGET_HEADERS.map(header => (
              <Badge key={header} variant="secondary" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UploadForm;