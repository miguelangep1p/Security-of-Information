"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { navByRole } from "@/lib/nav";
import { useSession } from "@/lib/client/session";

export function Sidebar() {
  const { session, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  if (!session) return null;

  return (
    <aside className="sidebar">
      <Logo />
      <div className="nav">
        {navByRole[session.role].map(({ label, href, icon: Icon }) => (
          <Link
            className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}
            href={href}
            key={href}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <div className="profile">
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: 1 }}>
            <div className="avatar" style={{ flexShrink: 0 }}>{session.initials}</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session.shortName}
              </b>
              <div
                className="muted"
                style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {session.cmp ? `CMP ${session.cmp}` : session.institution}
              </div>
            </div>
          </div>
          <button
            className="icon-btn"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
