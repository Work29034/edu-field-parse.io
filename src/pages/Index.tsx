import UploadForm from "@/components/UploadForm";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <section className="relative container mx-auto px-6 py-12">
          <header className="mb-12 text-center space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              EduParse
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform academic data effortlessly. Upload PDF or CSV files and get clean, standardized output with auto-calculated grade points.
            </p>
          </header>
          <UploadForm />
        </section>
      </main>
    </>
  );
};

export default Index;
