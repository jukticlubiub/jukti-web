"use client";

/** Opens the browser's print dialog (where "Save as PDF" lives). */
export function PrintButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
