"use client";

import { Check } from "lucide-react";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: 10,
        background: "var(--ink)",
        color: "#fff",
        fontSize: 13.5,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      <Check size={16} color="var(--green)" /> {message}
    </div>
  );
}
