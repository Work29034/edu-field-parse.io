import EduParseLogo from "@/components/EduParseLogo";
import UploadForm from "@/components/UploadForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const Index = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <header className="pt-14 pb-6 md:pt-20 md:pb-8 w-full max-w-5xl px-6 mx-auto">
        <div className="relative">
          <div aria-hidden className="absolute -top-10 left-1/2 -translate-x-1/2 h-48 w-48 md:h-72 md:w-72 rounded-full bg-gradient-to-tr from-primary/25 to-accent/25 blur-3xl" />
          <div className="flex items-center justify-center gap-4 md:gap-5">
            <EduParseLogo className="h-14 w-14 md:h-16 md:w-16" />
            <div className="leading-tight">
              <div className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">EduParse</div>
              <p className="text-sm md:text-base text-muted-foreground">PDF to CSV for Student Records</p>
            </div>
          </div>
        </div>
      </header>

      <section className="w-full max-w-5xl px-6 grid md:grid-cols-2 gap-8 md:gap-10 items-start">
        <div className="space-y-6">
          <h1 className="sr-only">EduParse: PDF to CSV Converter for Student Records</h1>
          <Card className="p-6 border border-border">
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><CheckCircle2 className="text-primary" /> <span className="text-sm text-foreground/90">Smart keyword-based field detection (handles unordered PDFs)</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="text-primary" /> <span className="text-sm text-foreground/90">Auto-fill Grade Points & Credits using mappings</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="text-primary" /> <span className="text-sm text-foreground/90">Clean CSV order: Roll No, Name, Class, Section, Department, Year, Semester, Subject Code, Subject Name, Grade, Grade Points, Credits</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 className="text-primary" /> <span className="text-sm text-foreground/90">Designed for large PDFs (20,000+ rows)</span></li>
            </ul>
          </Card>
          <div className="flex gap-3">
            <Button variant="link" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>

        <UploadForm />
      </section>

      <section id="how-it-works" className="w-full max-w-5xl px-6 mt-16 mb-24">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-5"><p className="text-sm text-foreground/90"><span className="font-semibold">1. Upload PDF</span> — submit your result PDF.</p></Card>
          <Card className="p-5"><p className="text-sm text-foreground/90"><span className="font-semibold">2. Server parses</span> — detects fields, fills missing Grade Points/Credits.</p></Card>
          <Card className="p-5"><p className="text-sm text-foreground/90"><span className="font-semibold">3. Download CSV</span> — get a link and access it later from the dashboard.</p></Card>
        </div>
      </section>
    </main>
  );
};

export default Index;
