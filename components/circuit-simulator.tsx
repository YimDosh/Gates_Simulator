"use client"

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { LogicGateSVG, InputNode, OutputNode, Wire, FlipFlopSVG } from "./logic-gates"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Constants & types ─────────────────────────────────────────────────────────

const GATE_TYPES = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR"] as const
type GateType = (typeof GATE_TYPES)[number]

const GATE_FNS: Record<GateType, (a: boolean, b: boolean) => boolean> = {
  AND:  (a, b) => a && b,
  OR:   (a, b) => a || b,
  NAND: (a, b) => !(a && b),
  NOR:  (a, b) => !(a || b),
  XOR:  (a, b) => a !== b,
  XNOR: (a, b) => a === b,
}

interface GateNode {
  inputs:      [boolean, boolean]
  type:        GateType
  rawOutput:   boolean     // gate's own computation (unmodified)
  output:      boolean     // value used downstream (= rawOutput; substitution is done on INPUTS of next level)
  isFFSourceS: boolean     // this gate's output drives FF.S (it is the pairIdx*2 gate)
  isFFSourceR: boolean     // this gate's output drives FF.R (it is the pairIdx*2+1 gate)
  isFFRecip:   boolean     // this gate's inputs were replaced with ffQ / !ffQ
}

interface CircuitLevel {
  gates: GateNode[]
  type:  GateType
}

// The FF sits BETWEEN two levels:
//   - S is driven by  gate[pairIdx*2]   at level afterLevelIdx
//   - R is driven by  gate[pairIdx*2+1] at level afterLevelIdx
//   - Q  feeds input-A of gate[pairIdx] at level afterLevelIdx+1
//   - Q̄  feeds input-B of gate[pairIdx] at level afterLevelIdx+1
interface FFPlacement {
  afterLevelIdx: number   // FF is inserted between this level and afterLevelIdx+1
  pairIdx:       number   // which gate-pair from afterLevelIdx the FF intercepts
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pow2(n: number) { return Math.pow(2, n) }

// ── Component ─────────────────────────────────────────────────────────────────

export function CircuitSimulator() {

  // ── Circuit configuration ─────────────────────────────────────────────────
  const [numLevels,  setNumLevels]  = useState(3)
  const [inputs,     setInputs]     = useState<boolean[]>(() =>
    Array.from({ length: pow2(3) }, () => false)
  )
  const [levelTypes, setLevelTypes] = useState<GateType[]>(() =>
    Array.from({ length: 3 }, (_, i) => GATE_TYPES[i % GATE_TYPES.length])
  )

  // ── SR Flip-Flop — logical state ─────────────────────────────────────────
  const [ffQ,         setFFQ]         = useState(false)
  const [ffPlacement, setFFPlacement] = useState<FFPlacement | null>(null)

  // ── SR Flip-Flop — visual / drag state ───────────────────────────────────
  const [ffPos,      setFFPos]      = useState({ x: 300, y: 150 })
  const [ffDragging, setFFDragging] = useState(false)
  const ffDragOffset = useRef({ dx: 0, dy: 0 })

  const svgRef = useRef<SVGSVGElement>(null)

  // ── Layout constants ──────────────────────────────────────────────────────
  const numInputs    = pow2(numLevels)
  const gateW        = 70
  const gateH        = 50
  // Wider spacing when FF is present to accommodate it between levels
  const levelSpacing = ffPlacement ? 300 : 220
  const inputSpacing = Math.max(65, 500 / numInputs)
  const startX       = 80
  const svgWidth     = startX + (numLevels + 1) * levelSpacing + 200
  const svgHeight    = Math.max(400, numInputs * inputSpacing + 80)

  const isNegated = (t: GateType) => t === "NAND" || t === "NOR" || t === "XNOR"
  const outOffset = (t: GateType) => gateW / 2 + (isNegated(t) ? 15 : 10)
  const getLevelX = (lvl: number) => startX + (lvl + 1) * levelSpacing

  const getInputY = (i: number) => {
    const totalH = (numInputs - 1) * inputSpacing
    return (svgHeight - totalH) / 2 + i * inputSpacing
  }
  const getGateY = (gi: number, total: number) => {
    const sp     = total > 1 ? (numInputs - 1) * inputSpacing / (total - 1) : 0
    const totalH = (total - 1) * sp
    return (svgHeight - totalH) / 2 + gi * sp
  }

  // PDF convention: Nivel 1 = output side, Nivel N = input side
  const getLevelLabel = (lvlIdx: number) => `N${numLevels - lvlIdx}`

  // Randomize inputs once on the client after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setInputs(Array.from({ length: pow2(numLevels) }, () => Math.random() > 0.5))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync array lengths when numLevels changes ─────────────────────────────
  useEffect(() => {
    const needed = pow2(numLevels)
    setInputs(prev => {
      if (prev.length === needed) return prev
      if (prev.length < needed)
        return [...prev, ...Array.from({ length: needed - prev.length }, () => Math.random() > 0.5)]
      return prev.slice(0, needed)
    })
    setLevelTypes(prev => {
      if (prev.length === numLevels) return prev
      if (prev.length < numLevels)
        return [
          ...prev,
          ...Array.from(
            { length: numLevels - prev.length },
            (_, i) => GATE_TYPES[(prev.length + i) % GATE_TYPES.length]
          ),
        ]
      return prev.slice(0, numLevels)
    })
    // Invalidate FF placement if it falls out of the new level range
    setFFPlacement(prev => (prev && prev.afterLevelIdx >= numLevels - 1) ? null : prev)
  }, [numLevels])

  // ── All valid FF placement options ────────────────────────────────────────
  // A valid slot exists for every gap (afterLevelIdx → afterLevelIdx+1)
  // and for every gate-pair at that gap.
  const validPlacements = useMemo(() => {
    const result: { afterLevelIdx: number; pairIdx: number; label: string }[] = []
    for (let li = 0; li < numLevels - 1; li++) {
      // Gates at level li = 2^(numLevels-1-li)
      const numGates = pow2(numLevels - 1 - li)
      const numPairs = numGates / 2
      for (let pi = 0; pi < numPairs; pi++) {
        const levelLabel = `${getLevelLabel(li)} → ${getLevelLabel(li + 1)}`
        const pairLabel  = numPairs > 1 ? ` · Par ${pi + 1}` : ""
        result.push({ afterLevelIdx: li, pairIdx: pi, label: levelLabel + pairLabel })
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numLevels])

  // ── Compute S and R source values — WITHOUT FF substitution ──────────────
  // Runs the circuit normally up to afterLevelIdx to get the raw outputs
  // that drive the FF's S and R inputs.
  const { ffSourceS, ffSourceR } = useMemo(() => {
    if (!ffPlacement) return { ffSourceS: false, ffSourceR: false }
    let vals = [...inputs]
    for (let lvl = 0; lvl <= ffPlacement.afterLevelIdx; lvl++) {
      const fn   = GATE_FNS[levelTypes[lvl] ?? "AND"]
      const next: boolean[] = []
      for (let i = 0; i < vals.length; i += 2) {
        next.push(i + 1 < vals.length ? fn(vals[i], vals[i + 1]) : vals[i])
      }
      vals = next
    }
    // vals[gi] is the raw output of gate gi at level afterLevelIdx
    const pi = ffPlacement.pairIdx
    return {
      ffSourceS: vals[pi * 2]     ?? false,
      ffSourceR: vals[pi * 2 + 1] ?? false,
    }
  }, [ffPlacement, inputs, levelTypes])

  // ── SR Latch truth table ──────────────────────────────────────────────────
  // S=0 R=0 → hold  (no state change — ffQ intentionally excluded from deps)
  // S=1 R=0 → Set   (Q = 1)
  // S=0 R=1 → Reset (Q = 0)
  // S=1 R=1 → Reset (forbidden state → treat as Reset)
  useEffect(() => {
    if (!ffPlacement) { setFFQ(false); return }
    const S = ffSourceS, R = ffSourceR
    if (S && !R) { setFFQ(true);  return }
    if (R)       { setFFQ(false); return }
    // S=0 R=0 → hold: intentionally NO setState to preserve memory
  }, [ffSourceS, ffSourceR, ffPlacement])

  // ── Compute circuit levels WITH FF substitution applied ──────────────────
  // After computing level afterLevelIdx, Q and Q̄ are injected as inputs to
  // gate[pairIdx] at level afterLevelIdx+1 (replacing the normal gate outputs).
  const circuitLevels = useMemo((): CircuitLevel[] => {
    if (inputs.length <= 1 || levelTypes.length === 0) return []
    const levels: CircuitLevel[] = []
    let vals = [...inputs]

    for (let lvl = 0; lvl < numLevels && vals.length > 1; lvl++) {
      const gateType = levelTypes[lvl] ?? "AND"
      const fn       = GATE_FNS[gateType]
      const gates:   GateNode[] = []
      const next:    boolean[]  = []

      for (let i = 0; i < vals.length; i += 2) {
        const gi        = i >> 1
        const a         = vals[i]
        const b         = i + 1 < vals.length ? vals[i + 1] : vals[i]
        const rawOutput = i + 1 < vals.length ? fn(a, b) : a

        const isFFSourceS = !!(ffPlacement?.afterLevelIdx === lvl && ffPlacement.pairIdx * 2     === gi)
        const isFFSourceR = !!(ffPlacement?.afterLevelIdx === lvl && ffPlacement.pairIdx * 2 + 1 === gi)
        const isFFRecip   = !!(ffPlacement?.afterLevelIdx === lvl - 1 && ffPlacement.pairIdx === gi)

        gates.push({ inputs: [a, b], type: gateType, rawOutput, output: rawOutput,
                     isFFSourceS, isFFSourceR, isFFRecip })
        next.push(rawOutput)
      }

      // Inject FF outputs AFTER level afterLevelIdx so that level afterLevelIdx+1
      // receives Q (instead of gate[pairIdx*2].output) and Q̄ (instead of gate[pairIdx*2+1].output)
      if (ffPlacement?.afterLevelIdx === lvl) {
        const p2 = ffPlacement.pairIdx * 2
        if (p2     < next.length) next[p2]     = ffQ
        if (p2 + 1 < next.length) next[p2 + 1] = !ffQ
      }

      levels.push({ gates, type: gateType })
      vals = next
    }
    return levels
  }, [inputs, levelTypes, numLevels, ffPlacement, ffQ])

  // ── Final output ─────────────────────────────────────────────────────────
  const finalOutput = useMemo((): boolean | null => {
    if (!circuitLevels.length) return null
    const last = circuitLevels[circuitLevels.length - 1]
    return last.gates[last.gates.length - 1]?.output ?? null
  }, [circuitLevels])

  // ── Input / level mutators ────────────────────────────────────────────────
  const toggleInput    = useCallback((i: number) =>
    setInputs(p => { const n = [...p]; n[i] = !n[i]; return n }), [])
  const setAllInputs   = useCallback((v: boolean) =>
    setInputs(p => p.map(() => v)), [])
  const randomizeInputs = useCallback(() =>
    setInputs(p => p.map(() => Math.random() > 0.5)), [])
  const setLevelType   = useCallback((lvl: number, type: GateType) =>
    setLevelTypes(p => { const n = [...p]; n[lvl] = type; return n }), [])
  const setAllGates    = useCallback((type: GateType) =>
    setLevelTypes(p => p.map(() => type)), [])

  // ── FF placement change ───────────────────────────────────────────────────
  const applyFFPlacement = useCallback((value: string) => {
    if (value === "none") {
      setFFPlacement(null)
      setFFQ(false)
      return
    }
    const [li, pi] = value.split(":").map(Number)
    setFFPlacement({ afterLevelIdx: li, pairIdx: pi })
  }, [])

  // Direct reset override (forces Q=0 regardless of SR state)
  const resetFF = useCallback(() => setFFQ(false), [])

  // ── FF drag (pointer events: unified mouse + touch) ───────────────────────
  const onFFPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const pt  = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    ffDragOffset.current = { dx: svgP.x - ffPos.x, dy: svgP.y - ffPos.y }
    setFFDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [ffPos])

  const onSVGPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!ffDragging) return
    const svg = svgRef.current
    if (!svg) return
    const pt  = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setFFPos({ x: svgP.x - ffDragOffset.current.dx, y: svgP.y - ffDragOffset.current.dy })
  }, [ffDragging])

  const onSVGPointerUp = useCallback(() => setFFDragging(false), [])

  // Auto-position the FF between its two source levels when placement changes
  const prevPlacementRef = useRef<FFPlacement | null>(null)
  useEffect(() => {
    const prev = prevPlacementRef.current
    const cur  = ffPlacement
    prevPlacementRef.current = cur
    if (!cur) return
    if (prev?.afterLevelIdx === cur.afterLevelIdx && prev?.pairIdx === cur.pairIdx) return
    const lvl = circuitLevels[cur.afterLevelIdx]
    if (!lvl) return
    const M      = lvl.gates.length
    const sGateY = getGateY(cur.pairIdx * 2, M)
    const rGateY = cur.pairIdx * 2 + 1 < M ? getGateY(cur.pairIdx * 2 + 1, M) : sGateY
    // Position the FF 155px after the source level center (optimized for levelSpacing=300)
    setFFPos({
      x: getLevelX(cur.afterLevelIdx) + 155,
      y: (sGateY + rGateY) / 2,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ffPlacement])

  // ── FF wire geometry ──────────────────────────────────────────────────────
  // Computes the 4 wire endpoints (S, R, Q, Q̄) based on current ffPos and circuit layout.
  //   FlipFlopSVG dimensions: width=100 (hw=50), height=80 (hh=40), pinLen=22
  //   S/R pin left-end:   ffPos.x - hw - pinLen = ffPos.x - 72
  //   Q  LED after-end:   ffPos.x + hw + pinLen + 16 = ffPos.x + 88
  //   Q̄  LED after-end:   ffPos.x + hw + pinLen + 23 = ffPos.x + 95  (negation bubble adds 7px)
  //   S/R/Q/Q̄ pin Y:      ffPos.y ± hh*0.45 = ffPos.y ± 18
  const ffGeom = useMemo(() => {
    if (!ffPlacement || circuitLevels.length < 2) return null

    const li = ffPlacement.afterLevelIdx
    const pi = ffPlacement.pairIdx
    const srcLevel = circuitLevels[li]
    const dstLevel = circuitLevels[li + 1]
    if (!srcLevel || !dstLevel) return null

    const M     = srcLevel.gates.length
    const nextM = dstLevel.gates.length

    // Source gate output X/Y positions
    const gateOutX = getLevelX(li) + outOffset(srcLevel.type) + 10
    const sGateY   = getGateY(pi * 2, M)
    const rGateY   = pi * 2 + 1 < M ? getGateY(pi * 2 + 1, M) : sGateY

    // Destination gate input X/Y positions
    const gateInX = getLevelX(li + 1) - gateW / 2 - 10
    const recipY  = getGateY(pi, nextM)

    // FF pin endpoints (matching FlipFlopSVG layout)
    const pinOffsetY = 18   // hh * 0.45 = 40 * 0.45 ≈ 18
    const sPinX  = ffPos.x - 72;  const sPinY  = ffPos.y - pinOffsetY
    const rPinX  = ffPos.x - 72;  const rPinY  = ffPos.y + pinOffsetY
    const qPinX  = ffPos.x + 88;  const qPinY  = ffPos.y - pinOffsetY
    const qbPinX = ffPos.x + 95;  const qbPinY = ffPos.y + pinOffsetY

    return {
      sWire:  { x1: gateOutX, y1: sGateY,           x2: sPinX,  y2: sPinY,                    active: ffSourceS },
      rWire:  { x1: gateOutX, y1: rGateY,            x2: rPinX,  y2: rPinY,                    active: ffSourceR },
      qWire:  { x1: qPinX,   y1: qPinY,              x2: gateInX, y2: recipY - gateH * 0.25,   active: ffQ       },
      qbWire: { x1: qbPinX,  y1: qbPinY,             x2: gateInX, y2: recipY + gateH * 0.25,   active: !ffQ      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ffPlacement, ffPos, circuitLevels, levelSpacing, ffSourceS, ffSourceR, ffQ])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── Control panels ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Level count */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase mb-4">
            Niveles del Circuito
          </h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline" size="sm"
              onClick={() => setNumLevels(n => Math.max(1, n - 1))}
              disabled={numLevels <= 1}
              className="font-mono text-base w-10 h-10 p-0 rounded-md"
            >−</Button>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-4xl font-mono font-bold text-primary leading-none">{numLevels}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{numInputs} entradas</span>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setNumLevels(n => Math.min(5, n + 1))}
              disabled={numLevels >= 5}
              className="font-mono text-base w-10 h-10 p-0 rounded-md"
            >+</Button>
          </div>
        </div>

        {/* Gate type per level */}
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase">
              Compuerta por Nivel
            </h3>
            <Select onValueChange={v => setAllGates(v as GateType)}>
              <SelectTrigger className="w-[130px] h-7 font-mono text-[10px] bg-secondary text-secondary-foreground rounded-md">
                <SelectValue placeholder="Todas igual" />
              </SelectTrigger>
              <SelectContent>
                {GATE_TYPES.map(gt => (
                  <SelectItem key={gt} value={gt} className="font-mono text-xs">{gt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: numLevels }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {getLevelLabel(i)}
                </label>
                <Select value={levelTypes[i] ?? "AND"} onValueChange={v => setLevelType(i, v as GateType)}>
                  <SelectTrigger className="w-[100px] h-9 font-mono text-xs bg-secondary text-secondary-foreground rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATE_TYPES.map(gt => (
                      <SelectItem key={gt} value={gt} className="font-mono text-xs">{gt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Input toggles ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase">
            Entradas Binarias ({numInputs})
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllInputs(true)}
              className="font-mono text-[10px] h-7 px-3 rounded-md"
              style={{ color: "var(--signal-high)", borderColor: "color-mix(in oklch, var(--signal-high) 30%, transparent)" }}>
              Todo 1
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllInputs(false)}
              className="font-mono text-[10px] h-7 px-3 rounded-md"
              style={{ color: "var(--signal-low)", borderColor: "color-mix(in oklch, var(--signal-low) 30%, transparent)" }}>
              Todo 0
            </Button>
            <Button variant="outline" size="sm" onClick={randomizeInputs}
              className="font-mono text-[10px] h-7 px-3 rounded-md">
              Aleatorio
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {inputs.map((val, i) => (
            <button
              key={i} onClick={() => toggleInput(i)}
              className="w-11 h-11 rounded border-2 font-mono font-bold text-base transition-all duration-150"
              style={{
                borderColor:     val ? "var(--signal-high)" : "var(--signal-low)",
                backgroundColor: val ? "color-mix(in oklch, var(--signal-high) 12%, transparent)"
                                     : "color-mix(in oklch, var(--signal-low) 12%, transparent)",
                color:     val ? "var(--signal-high)" : "var(--signal-low)",
                boxShadow: val ? "0 0 10px color-mix(in oklch, var(--signal-high) 40%, transparent)" : "none",
              }}
              aria-label={`Entrada ${i}: ${val ? "1" : "0"}`}
            >
              {val ? "1" : "0"}
            </button>
          ))}
        </div>
      </div>

      {/* ── SR Flip-Flop placement ──────────────────────────────────────────── */}
      {numLevels >= 2 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase">
                SR Flip-Flop — Nivel Intermedio
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground">
                S y R son controlados por las salidas del nivel elegido; Q y Q̄ alimentan el siguiente nivel.
              </p>
            </div>
            <Select
              value={ffPlacement ? `${ffPlacement.afterLevelIdx}:${ffPlacement.pairIdx}` : "none"}
              onValueChange={applyFFPlacement}
            >
              <SelectTrigger className="w-[260px] h-9 font-mono text-xs bg-secondary text-secondary-foreground rounded-md shrink-0">
                <SelectValue placeholder="Sin Flip-Flop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="font-mono text-xs">Sin Flip-Flop</SelectItem>
                {validPlacements.map(p => (
                  <SelectItem
                    key={`${p.afterLevelIdx}:${p.pairIdx}`}
                    value={`${p.afterLevelIdx}:${p.pairIdx}`}
                    className="font-mono text-xs"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ffPlacement && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-4">
              {/* S input */}
              <div className="flex flex-col gap-0.5 items-center">
                <span className="text-[9px] font-mono text-muted-foreground uppercase">S (entrada)</span>
                <span className="font-mono text-lg font-bold"
                  style={{ color: ffSourceS ? "var(--signal-high)" : "var(--signal-low)" }}>
                  {ffSourceS ? "1" : "0"}
                </span>
              </div>
              {/* R input */}
              <div className="flex flex-col gap-0.5 items-center">
                <span className="text-[9px] font-mono text-muted-foreground uppercase">R (entrada)</span>
                <span className="font-mono text-lg font-bold"
                  style={{ color: ffSourceR ? "var(--signal-high)" : "var(--signal-low)" }}>
                  {ffSourceR ? "1" : "0"}
                </span>
              </div>
              {/* Q output */}
              <div className="flex flex-col gap-0.5 items-center">
                <span className="text-[9px] font-mono text-muted-foreground uppercase">Q (salida)</span>
                <span className="font-mono text-lg font-bold"
                  style={{ color: ffQ ? "var(--signal-high)" : "var(--signal-low)" }}>
                  {ffQ ? "1" : "0"}
                </span>
              </div>
              {/* Q̄ output */}
              <div className="flex flex-col gap-0.5 items-center">
                <span className="text-[9px] font-mono text-muted-foreground uppercase">Q̄ (salida)</span>
                <span className="font-mono text-lg font-bold"
                  style={{ color: !ffQ ? "var(--signal-high)" : "var(--signal-low)" }}>
                  {!ffQ ? "1" : "0"}
                </span>
              </div>
              {/* State description */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] font-mono text-muted-foreground italic">
                  {ffSourceS && !ffSourceR ? "SET — Q memoriza 1"
                   : ffSourceR             ? "RESET — Q forzado a 0"
                   : ffQ                   ? "HOLD — Q mantiene estado (1)"
                                           : "En espera de S"}
                </span>
                <Button
                  variant="outline" size="sm"
                  onClick={resetFF}
                  disabled={!ffQ}
                  className="font-mono text-[10px] h-7 px-3 rounded-md"
                  style={{
                    color: "var(--signal-low)",
                    borderColor: "color-mix(in oklch, var(--signal-low) 40%, transparent)",
                    opacity: ffQ ? 1 : 0.4,
                  }}
                >
                  ↺ Reset FF
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Circuit SVG diagram ──────────────────────────────────────────────── */}
      {circuitLevels.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <svg
            ref={svgRef}
            width={svgWidth} height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="min-w-full"
            role="img" aria-label="Diagrama del circuito lógico"
            onPointerMove={onSVGPointerMove}
            onPointerUp={onSVGPointerUp}
            onPointerLeave={onSVGPointerUp}
            style={{ cursor: ffDragging ? "grabbing" : "default", touchAction: "none" }}
          >
            {/* Dot-grid background */}
            <defs>
              <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1" fill="var(--border)" opacity="0.35" />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#dotgrid)" />

            {/* ── Wires: inputs → level 0 ────────────────────────────────── */}
            {circuitLevels[0]?.gates.map((_, gi) => {
              const gX  = getLevelX(0)
              const gY  = getGateY(gi, circuitLevels[0].gates.length)
              const i1  = gi * 2
              const i2  = gi * 2 + 1
              const inX = gX - gateW / 2 - 10
              return (
                <React.Fragment key={`win-${gi}`}>
                  <Wire x1={startX + 22} y1={getInputY(i1)} x2={inX} y2={gY - gateH * 0.25}
                    active={inputs[i1]} horizontal />
                  {i2 < inputs.length && (
                    <Wire x1={startX + 22} y1={getInputY(i2)} x2={inX} y2={gY + gateH * 0.25}
                      active={inputs[i2]} horizontal />
                  )}
                </React.Fragment>
              )
            })}

            {/* ── Wires: between levels ─────────────────────────────────── */}
            {circuitLevels.slice(1).map((level, li) => {
              const prevLevel = circuitLevels[li]
              return level.gates.map((_, gi) => {
                // Skip wires that the FF intercepts — those are drawn as FF connections below
                const isFFIntercept = !!(ffPlacement?.afterLevelIdx === li && ffPlacement.pairIdx === gi)
                if (isFFIntercept) return null

                const cX    = getLevelX(li + 1)
                const cY    = getGateY(gi, level.gates.length)
                const pi1   = gi * 2
                const pi2   = gi * 2 + 1
                const srcX  = getLevelX(li) + outOffset(prevLevel.type) + 10
                const destX = cX - gateW / 2 - 10

                return (
                  <React.Fragment key={`wlv-${li + 1}-${gi}`}>
                    {pi1 < prevLevel.gates.length && (
                      <Wire
                        x1={srcX} y1={getGateY(pi1, prevLevel.gates.length)}
                        x2={destX} y2={cY - gateH * 0.25}
                        active={prevLevel.gates[pi1].output} horizontal
                      />
                    )}
                    {pi2 < prevLevel.gates.length && (
                      <Wire
                        x1={srcX} y1={getGateY(pi2, prevLevel.gates.length)}
                        x2={destX} y2={cY + gateH * 0.25}
                        active={prevLevel.gates[pi2].output} horizontal
                      />
                    )}
                  </React.Fragment>
                )
              })
            })}

            {/* ── Wire: last gate → output node ─────────────────────────── */}
            {(() => {
              const last   = circuitLevels[circuitLevels.length - 1]
              const lastGI = last.gates.length - 1
              const lX     = getLevelX(circuitLevels.length - 1)
              const lY     = getGateY(lastGI, last.gates.length)
              const oX     = getLevelX(circuitLevels.length) + 20
              return (
                <Wire
                  x1={lX + outOffset(last.type) + 10} y1={lY}
                  x2={oX - 30}                        y2={svgHeight / 2}
                  active={finalOutput ?? false} horizontal
                />
              )
            })()}

            {/* ── Input nodes (left side) ───────────────────────────────── */}
            {inputs.map((val, i) => (
              <InputNode key={`in-${i}`} x={startX} y={getInputY(i)}
                value={val} label={`I${i}`} onClick={() => toggleInput(i)} />
            ))}

            {/* ── Gate levels ──────────────────────────────────────────── */}
            {circuitLevels.map((level, li) => (
              <React.Fragment key={`lv-${li}`}>
                {/* Level label */}
                <rect x={getLevelX(li) - 18} y={8} width={36} height={18} rx={3}
                  fill="var(--secondary)" stroke="var(--border)" strokeWidth={0.5} />
                <text x={getLevelX(li)} y={21} textAnchor="middle"
                  className="font-mono font-bold"
                  style={{ fontSize: "9px", fill: "var(--muted-foreground)" }}>
                  {getLevelLabel(li)}
                </text>

                {/* Gates */}
                {level.gates.map((gate, gi) => {
                  const gX = getLevelX(li)
                  const gY = getGateY(gi, level.gates.length)

                  // Visual accent for gates involved with the FF
                  const accentS = gate.isFFSourceS
                  const accentR = gate.isFFSourceR
                  const accentQ = gate.isFFRecip
                  const hasAccent = accentS || accentR || accentQ
                  const accentColor = accentQ
                    ? "var(--primary)"
                    : accentS
                    ? "var(--signal-high)"
                    : "var(--signal-low)"

                  return (
                    <g key={`g-${li}-${gi}`}>
                      {/* Accent ring when gate is FF-connected */}
                      {hasAccent && (
                        <circle
                          cx={gX} cy={gY} r={38}
                          fill={`color-mix(in oklch, ${accentColor} 8%, transparent)`}
                          stroke={accentColor}
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          opacity={0.7}
                        />
                      )}
                      <LogicGateSVG type={gate.type} x={gX} y={gY} output={gate.rawOutput} />

                      {/* Badge: S / R / Q↑Q̄ labels */}
                      {accentS && (
                        <text x={gX} y={gY + 38} textAnchor="middle"
                          style={{ fontSize: "9px", fill: "var(--signal-high)", fontFamily: "monospace",
                                   fontWeight: "bold", pointerEvents: "none" }}>
                          →S
                        </text>
                      )}
                      {accentR && (
                        <text x={gX} y={gY + 38} textAnchor="middle"
                          style={{ fontSize: "9px", fill: "var(--signal-low)", fontFamily: "monospace",
                                   fontWeight: "bold", pointerEvents: "none" }}>
                          →R
                        </text>
                      )}
                      {accentQ && (
                        <text x={gX} y={gY + 38} textAnchor="middle"
                          style={{ fontSize: "9px", fill: "var(--primary)", fontFamily: "monospace",
                                   fontWeight: "bold", pointerEvents: "none" }}>
                          Q/Q̄→
                        </text>
                      )}
                    </g>
                  )
                })}
              </React.Fragment>
            ))}

            {/* ── Output node (right side) ──────────────────────────────── */}
            {finalOutput !== null && (
              <OutputNode
                x={getLevelX(circuitLevels.length) + 20}
                y={svgHeight / 2}
                value={finalOutput}
              />
            )}

            {/* ── FF connection wires (S, R, Q, Q̄) ─────────────────────── */}
            {ffGeom && (
              <>
                {/* S wire: source gate[pairIdx*2] → FF S pin */}
                <Wire x1={ffGeom.sWire.x1} y1={ffGeom.sWire.y1}
                      x2={ffGeom.sWire.x2} y2={ffGeom.sWire.y2}
                      active={ffGeom.sWire.active} horizontal />
                {/* R wire: source gate[pairIdx*2+1] → FF R pin */}
                <Wire x1={ffGeom.rWire.x1} y1={ffGeom.rWire.y1}
                      x2={ffGeom.rWire.x2} y2={ffGeom.rWire.y2}
                      active={ffGeom.rWire.active} horizontal />
                {/* Q wire: FF Q pin → gate[pairIdx] input-A at next level */}
                <Wire x1={ffGeom.qWire.x1} y1={ffGeom.qWire.y1}
                      x2={ffGeom.qWire.x2} y2={ffGeom.qWire.y2}
                      active={ffGeom.qWire.active} horizontal />
                {/* Q̄ wire: FF Q̄ pin → gate[pairIdx] input-B at next level */}
                <Wire x1={ffGeom.qbWire.x1} y1={ffGeom.qbWire.y1}
                      x2={ffGeom.qbWire.x2} y2={ffGeom.qbWire.y2}
                      active={ffGeom.qbWire.active} horizontal />
              </>
            )}

            {/* ── Draggable SR Flip-Flop ────────────────────────────────── */}
            {ffPlacement && (
              <FlipFlopSVG
                x={ffPos.x} y={ffPos.y}
                q={ffQ} s={ffSourceS} r={ffSourceR}
                dragging={ffDragging}
                onPointerDown={onFFPointerDown}
              />
            )}
          </svg>
        </div>
      )}

      {/* ── Results panel ───────────────────────────────────────────────────── */}
      {circuitLevels.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">

          {/* Partial results per level */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase mb-4">
              Resultados Parciales
            </h3>
            <div className="flex flex-col gap-3">
              {circuitLevels.map((level, li) => (
                <div key={li} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground w-10 shrink-0 uppercase">
                    {getLevelLabel(li)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">
                    {level.type}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {level.gates.map((gate, gi) => (
                      <div key={gi} className="flex items-center gap-1">
                        {gate.isFFSourceS && (
                          <span className="text-[9px] font-mono font-bold"
                            style={{ color: "var(--signal-high)", opacity: 0.85 }}>S</span>
                        )}
                        {gate.isFFSourceR && (
                          <span className="text-[9px] font-mono font-bold"
                            style={{ color: "var(--signal-low)", opacity: 0.85 }}>R</span>
                        )}
                        {gate.isFFRecip && (
                          <span className="text-[9px] font-mono font-bold"
                            style={{ color: "var(--primary)", opacity: 0.85 }}>Q</span>
                        )}
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: gate.output ? "var(--signal-high)" : "var(--signal-low)",
                            boxShadow: gate.output ? "0 0 6px var(--signal-high)" : "0 0 6px var(--signal-low)",
                          }}
                          aria-label={gate.output ? "1" : "0"}
                        />
                        <span className="font-mono text-xs font-bold"
                          style={{ color: gate.output ? "var(--signal-high)" : "var(--signal-low)" }}>
                          {gate.output ? "1" : "0"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final result */}
          {finalOutput !== null && (
            <div
              className="rounded-lg border-2 p-6 flex flex-col items-center justify-center gap-2 min-w-[180px] transition-all duration-300"
              style={{
                borderColor: finalOutput ? "var(--signal-high)" : "var(--signal-low)",
                backgroundColor: finalOutput
                  ? "color-mix(in oklch, var(--signal-high) 5%, transparent)"
                  : "color-mix(in oklch, var(--signal-low) 5%, transparent)",
              }}
            >
              <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest uppercase">
                Resultado Final
              </span>
              <span
                className="inline-block w-10 h-10 rounded-full"
                style={{
                  backgroundColor: finalOutput ? "var(--signal-high)" : "var(--signal-low)",
                  boxShadow: finalOutput
                    ? "0 0 20px var(--signal-high), 0 0 40px var(--signal-high)"
                    : "0 0 20px var(--signal-low),  0 0 40px var(--signal-low)",
                }}
              />
              <span className="text-3xl font-mono font-bold"
                style={{ color: finalOutput ? "var(--signal-high)" : "var(--signal-low)" }}>
                {finalOutput ? "1" : "0"}
              </span>
              <span className="text-xs font-mono"
                style={{ color: finalOutput ? "var(--signal-high)" : "var(--signal-low)" }}>
                {finalOutput ? "VERDADERO" : "FALSO"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
