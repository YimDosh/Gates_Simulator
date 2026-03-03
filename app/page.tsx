import { CircuitSimulator } from "@/components/circuit-simulator"
import { GateReference } from "@/components/gate-reference"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded border border-primary/25 bg-primary/5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2 7h5a4 4 0 0 1 0 8H2V7z" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
                <line x1="11" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
                <circle cx="18" cy="11" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-sans font-bold text-foreground text-balance">
                Simulador de Circuitos Logicos
              </h1>
              <p className="text-sm font-mono text-muted-foreground">
                Arma circuitos en arbol, elige niveles y compuertas, y observa resultados en tiempo real
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <GateReference />
          <CircuitSimulator />
        </div>

        <footer className="mt-12 pt-6 border-t border-border">
          <p className="text-center text-xs font-mono text-muted-foreground">
            Simulador de Circuitos Logicos en Arbol &mdash; Herramienta Educativa
          </p>
        </footer>
      </div>
    </main>
  )
}
