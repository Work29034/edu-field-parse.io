import React from "react";

export default function AppHeader() {
  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <a href="/" className="inline-flex items-center gap-2 font-semibold">
          <span className="text-primary">Edu</span>
          <span className="text-accent">Parse</span>
        </a>
        <nav className="text-sm text-muted-foreground hidden sm:block">
          Convert PDF/CSV to clean CSV
        </nav>
      </div>
    </header>
  );
}
