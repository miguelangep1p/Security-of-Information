"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, homePath } from "@/lib/access";
import { useSession } from "@/lib/client/session";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { ready, session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!canAccess(session.role, pathname)) {
      router.replace(homePath(session.role));
    }
  }, [ready, session, pathname, router]);

  if (!ready || !session) return null;
  if (!canAccess(session.role, pathname)) return null;
  return <>{children}</>;
}
