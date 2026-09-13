"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PendingAccount } from "@/components/PendingAccount";
import { AppShellSkeleton } from "@/components/Skeleton";
import { canAccess, homePath } from "@/lib/access";
import { useSession } from "@/lib/client/session";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { ready, session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const pending = session !== null && session.membershipStatus !== "Habilitado";

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!pending && !canAccess(session.role, pathname)) {
      router.replace(homePath(session.role));
    }
  }, [ready, session, pending, pathname, router]);

  // Muestra el esqueleto del panel en vez de una pantalla en blanco mientras resuelve la sesión o redirige.
  if (!ready || !session) return <AppShellSkeleton />;
  // Un membership Pendiente o Suspendido nunca ve las rutas del rol: cada Route Handler ya lo bloquearía,
  // pero mostrar esta pantalla evita paneles rotos por 403 en vez de una explicación clara.
  if (pending) return <PendingAccount />;
  if (!canAccess(session.role, pathname)) return <AppShellSkeleton />;
  return <>{children}</>;
}
