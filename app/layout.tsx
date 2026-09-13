import type { Metadata } from "next";
import { SessionProvider } from "@/lib/client/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexo Clínico",
  description: "Digitalización clínica segura",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
