"use client";

import { usePathname } from "next/navigation";

// Remonta con un fade-in suave al cambiar de ruta; el layout que lo envuelve (sidebar, etc.) no se mueve.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
