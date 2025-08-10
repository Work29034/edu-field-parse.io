import UploadForm from "@/components/UploadForm";

const Index = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="w-full">
        <h1 className="sr-only">EduParse - PDF/CSV to clean CSV</h1>
        <UploadForm />
      </section>
    </main>
  );
};

export default Index;
