import UploadForm from "@/components/UploadForm";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <section className="container mx-auto px-6 py-10">
          <header className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">EduParse - Convert PDF/CSV to clean CSV</h1>
            <p className="mt-2 text-muted-foreground">Upload a PDF or CSV. We reorder columns, auto-fill Grade Points and Credits, and give you a clean CSV.</p>
          </header>
          <UploadForm />
        </section>
      </main>
    </>
  );
};

export default Index;
