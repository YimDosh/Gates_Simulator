"use client"

import { LogicGateIcon, FlipFlopIcon } from "./logic-gates"

const GATES = [
  { type: "AND",  desc: "A AND B",       truth: "1 solo si ambas entradas son 1" },
  { type: "OR",   desc: "A OR B",        truth: "1 si al menos una entrada es 1" },
  { type: "NAND", desc: "NOT(A AND B)",  truth: "0 solo si ambas entradas son 1" },
  { type: "NOR",  desc: "NOT(A OR B)",   truth: "1 solo si ambas entradas son 0" },
  { type: "XOR",  desc: "A XOR B",       truth: "1 si las entradas son diferentes" },
  { type: "XNOR", desc: "A XNOR B",     truth: "1 si las entradas son iguales" },
] as const

export function GateReference() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase mb-4">
        Referencia de Compuertas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {GATES.map((gate) => (
          <div
            key={gate.type}
            className="flex flex-col items-center gap-1.5 rounded border border-border bg-secondary/20 p-3"
          >
            <LogicGateIcon type={gate.type} size={90} />
            <p className="font-mono text-xs font-bold text-foreground">{gate.type}</p>
            <p className="font-mono text-[9px] text-muted-foreground text-center leading-tight">{gate.truth}</p>
          </div>
        ))}

        {/* SR Flip-Flop */}
        <div className="flex flex-col items-center gap-1.5 rounded border border-primary/30 bg-primary/5 p-3">
          <FlipFlopIcon size={90} />
          <p className="font-mono text-xs font-bold text-foreground">SR FF</p>
          <p className="font-mono text-[9px] text-muted-foreground text-center leading-tight">
            Memoria: Q mantiene estado
          </p>
        </div>
      </div>
    </div>
  )
}

