import { Logo } from "@/components/Logo";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        gap: 22,
      }}
    >
      <Logo />
      <div className="spinner" style={{ margin: 0 }} />
    </div>
  );
}
