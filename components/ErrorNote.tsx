import { AlertTriangle } from "lucide-react";

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div
      className="verified"
      role="alert"
      style={{ background: "#fff1ef", borderColor: "#f1ceca", color: "var(--red)" }}
    >
      <AlertTriangle size={18} /> {message}
    </div>
  );
}
