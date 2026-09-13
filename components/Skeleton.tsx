import { Logo } from "@/components/Logo";

function Bar({ width, height = 12, radius = 7 }: { width: number | string; height?: number; radius?: number }) {
  return <span className="skel" style={{ width, height, borderRadius: radius }} />;
}

function ScreenReaderStatus() {
  return <span className="sr-only">Cargando</span>;
}

// Aproxima la forma de una página de panel (encabezado, métricas y paneles) mientras carga el segmento real.
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ScreenReaderStatus />
      <div className="pagehead">
        <div>
          <Bar width={120} height={11} />
          <div style={{ marginTop: 10 }}>
            <Bar width={220} height={26} radius={8} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Bar width={260} height={14} />
          </div>
        </div>
        <Bar width={120} height={26} radius={99} />
      </div>

      <div className="stats">
        {[0, 1, 2].map((i) => (
          <div className="stat" key={i}>
            <div style={{ marginBottom: 10 }}>
              <Bar width={46} height={26} />
            </div>
            <Bar width={90} height={12} />
          </div>
        ))}
      </div>

      <div className="feature">
        <div style={{ flex: 1 }}>
          <Bar width={110} height={11} />
          <div style={{ marginTop: 10 }}>
            <Bar width={230} height={22} radius={8} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Bar width={270} height={14} />
          </div>
        </div>
        <Bar width={150} height={44} radius={10} />
      </div>

      <div className="review-layout" style={{ marginTop: 30 }}>
        {[0, 1].map((panel) => (
          <div className="panel" key={panel}>
            <div className="panel-head">
              <Bar width={150} height={14} />
              <Bar width={70} height={20} radius={99} />
            </div>
            <div className="transcription">
              <RowsSkeleton rows={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 4, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <table className="table" aria-busy="true">
      <caption className="sr-only">Cargando</caption>
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <Bar width={i === 0 ? 88 : 64} height={10} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <td key={c}>
                <Bar width={c === 0 ? "72%" : "48%"} height={12} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      <ScreenReaderStatus />
      {Array.from({ length: rows }).map((_, i) => (
        <div className="listrow" key={i}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 7 }}>
              <Bar width={`${58 - i * 6}%`} height={13} />
            </div>
            <Bar width={`${38 - i * 3}%`} height={11} />
          </div>
          <Bar width={72} height={22} radius={99} />
        </div>
      ))}
    </div>
  );
}

export function SplitSkeleton() {
  return (
    <div className="review-layout" aria-busy="true">
      <ScreenReaderStatus />
      <div className="panel">
        <RowsSkeleton rows={5} />
      </div>
      <div className="panel">
        <div className="panel-head">
          <Bar width={160} height={14} />
          <Bar width={70} height={20} radius={99} />
        </div>
        <div className="transcription">
          <div style={{ marginBottom: 14 }}>
            <Bar width="88%" height={12} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Bar width="72%" height={12} />
          </div>
          <div className="result-grid" style={{ padding: 0 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div style={{ marginBottom: 6 }}>
                  <Bar width={70} height={10} />
                </div>
                <Bar width={110} height={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Igual que la barra lateral real, pero con placeholders: se usa antes de conocer el rol de la sesión.
export function AppShellSkeleton() {
  return (
    <div className="app" aria-busy="true">
      <ScreenReaderStatus />
      <aside className="sidebar">
        <Logo />
        <div className="nav">
          {[0, 1, 2, 3].map((i) => (
            <div className="skel-row" key={i} style={{ padding: "12px 13px" }}>
              <Bar width={19} height={19} radius={5} />
              <Bar width={70} height={12} />
            </div>
          ))}
        </div>
        <div className="profile">
          <div className="skel-row">
            <span className="skel" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ marginBottom: 6 }}>
                <Bar width={90} height={12} />
              </div>
              <Bar width={70} height={10} />
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <DashboardSkeleton />
      </main>
    </div>
  );
}
