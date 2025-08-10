import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE_MB = 50; // front-end guard only

const UploadForm: React.FC = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (f && f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    setFile(f ?? null);
  };

  const simulateProgress = () => {
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(98, p + Math.random() * 15);
      setProgress(p);
    }, 250);
    return () => clearInterval(iv);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "No file selected", description: "Choose a PDF to continue." });
      return;
    }

    setIsLoading(true);
    const stop = simulateProgress();

    // Backend note
    toast({
      title: "Connect backend to proceed",
      description:
        "To parse PDFs and generate CSVs, connect Supabase in Lovable (top right). We'll store files and metadata, and return a download link.",
    });

    // Simulate brief processing
    await new Promise((r) => setTimeout(r, 1600));
    stop();
    setProgress(100);
    setIsLoading(false);
  };

  return (
    <Card className="p-6 md:p-8 backdrop-blur supports-[backdrop-filter]:bg-background/80 border border-border shadow-[var(--shadow-elegant)]">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="pdf" className="text-sm font-medium text-foreground">Upload student PDF</label>
          <Input
            id="pdf"
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB • PDF only</p>
          {!!file && (
            <p className="text-sm text-foreground/80">Selected: {file.name}</p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Processing…</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" variant="hero" className="w-full">Convert to CSV</Button>
        </div>
        <ul className="text-xs text-muted-foreground leading-relaxed list-disc pl-5">
          <li>Smart detection of mixed/unordered fields</li>
          <li>Auto-fill Grade Points & Credits via mapping</li>
          <li>Clean CSV order: Roll No, Name, Class, Section, Department, Year, Semester, Subject Code, Subject Name, Grade, Grade Points, Credits</li>
        </ul>
      </form>
    </Card>
  );
};

export default UploadForm;
