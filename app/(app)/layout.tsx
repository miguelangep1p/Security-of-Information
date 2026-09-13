import { PageTransition } from "@/components/PageTransition";
import { SessionGuard } from "@/components/SessionGuard";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="app">
        <Sidebar />
        <main className="main">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </SessionGuard>
  );
}
