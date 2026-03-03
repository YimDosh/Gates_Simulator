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

const GATE_TYPES = ["AND", "OR", "NAND", "NOR", "XOR", "XNOR"] as const
type GateType = (typeof GATE_TYPES)[number]

const gateFunctions: Record<GateType, (a: boolean, b: boolean) => boolean> = {
  AND: (a, b) => a && b,
  OR: (a, b) => a || b,
  NAND: (a, b) => !(a && b),
  NOR: (a, b) => !(a || b),
  XOR: (a, b) => a !== b,
  XNOR: (a, b) => a === b,
}

interface GateNode {
  inputs: [boolean, boolean]
  type: GateType
  output: boolean
}

interface CircuitLevel {
  gates: GateNode[]
  type: GateType
}

function inputsForLevels(levels: number) {
  return Math.pow(2, levels)
}

// ── Flip-Flop state ──────────────────────────────────────────────────────────
interface FFState {
  q: boolean
  s: boolean
  r: boolean
  pos: { x: number; y: number }
  dragging: boolean
  dragOffset: { dx: number; dy: number }
}

export function CircuitSimulator() {
  const [numLevels, setNumLevels] = useState(3)
  const numInputs = inputsForLevels(numLevels)
  const [inputs, setInputs] = useState<boolean[]>(() =>
    Array.from({ length: inputsForLevels(3) }, () => Math.random() > 0.5)
  )
  const [levelTypes, setLevelTypes] = useState<GateType[]>(() =>
    Array.from({ length: 3 }, (_, i) => GATE_TYPES[i % GATE_TYPES.length])
  )

  // Flip-Flop
  const [ff, setFF] = useState<FFState>({
    q: false, s: false, r: false,
    pos: { x: 200, y: 80 },
    dragging: false,
    dragOffset: { dx: 0, dy: 0 },
  })
  const svgRef = useRef<SVGSVGElement>(null)

  // SR latch logic: update Q when S or R change
  useEffect(() => {
    setFF((prev) => {
      if (prev.s && !prev.r) return { ...prev, q: true }   // Set
      if (!prev.s && prev.r) return { ...prev, q: false }  // Reset
      if (prev.s && prev.r)  return { ...prev, q: false }  // Invalid → 0
      return prev                                           // Hold
    })
  }, [ff.s, ff.r])

  const toggleFFInput = useCallback((pin: "s" | "r") => {
    setFF((prev) => ({ ...prev, [pin]: !prev[pin] }))
  }, [])

  // Drag handlers
  const onFFMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setFF((prev) => ({
      ...prev,
      dragging: true,
      dragOffset: { dx: svgP.x - prev.pos.x, dy: svgP.y - prev.pos.y },
    }))
  }, [])

  const onSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setFF((prev) => {
      if (!prev.dragging) return prev
      const svg = svgRef.current
      if (!svg) return prev
      const pt = svg.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
      return { ...prev, pos: { x: svgP.x - prev.dragOffset.dx, y: svgP.y - prev.dragOffset.dy } }
    })
  }, [])

  const onSVGMouseUp = useCallback(() => {
    setFF((prev) => prev.dragging ? { ...prev, dragging: false } : prev)
  }, [])

  // Touch drag
  const onFFTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const touch = e.touches[0]
    const pt = svg.createSVGPoint()
    pt.x = touch.clientX; pt.y = touch.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setFF((prev) => ({
      ...prev,
      dragging: true,
      dragOffset: { dx: svgP.x - prev.pos.x, dy: svgP.y - prev.pos.y },
    }))
  }, [])

  const onSVGTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    setFF((prev) => {
      if (!prev.dragging) return prev
      const svg = svgRef.current
      if (!svg) return prev
      const touch = e.touches[0]
      const pt = svg.createSVGPoint()
      pt.x = touch.clientX; pt.y = touch.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
      return { ...prev, pos: { x: svgP.x - prev.dragOffset.dx, y: svgP.y - prev.dragOffset.dy } }
    })
  }, [])

  useEffect(() => {
    const needed = inputsForLevels(numLevels)
    setInputs((prev) => {
      if (prev.length === needed) return prev
      if (prev.length < needed)
        return [
          ...prev,
          ...Array.from({ length: needed - prev.length }, () => Math.random() > 0.5),
        ]
      return prev.slice(0, needed)
    })
    setLevelTypes((prev) => {
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
  }, [numLevels])

  const circuitLevels = useMemo<CircuitLevel[]>(() => {
    if (inputs.length <= 1 || levelTypes.length === 0) return []
    const levels: CircuitLevel[] = []
    let currentValues = [...inputs]

    for (let level = 0; level < numLevels && currentValues.length > 1; level++) {
      const gateType = levelTypes[level] || "AND"
      const gates: GateNode[] = []
      const nextValues: boolean[] = []

      for (let i = 0; i < currentValues.length; i += 2) {
        if (i + 1 < currentValues.length) {
          const a = currentValues[i]
          const b = currentValues[i + 1]
          const output = gateFunctions[gateType](a, b)
          gates.push({ inputs: [a, b], type: gateType, output })
          nextValues.push(output)
        } else {
          gates.push({
            inputs: [currentValues[i], currentValues[i]],
            type: gateType,
            output: currentValues[i],
          })
          nextValues.push(currentValues[i])
        }
      }

      levels.push({ gates, type: gateType })
      currentValues = nextValues
    }
    return levels
  }, [inputs, levelTypes, numLevels])

  const toggleInput = useCallback((index: number) => {
    setInputs((prev) => {
      const n = [...prev]
      n[index] = !n[index]
      return n
    })
  }, [])

  const setAllInputs = useCallback((val: boolean) => {
    setInputs((prev) => prev.map(() => val))
  }, [])

  const randomizeInputs = useCallback(() => {
    setInputs((prev) => prev.map(() => Math.random() > 0.5))
  }, [])

  const setLevelType = useCallback((level: number, type: GateType) => {
    setLevelTypes((prev) => {
      const n = [...prev]
      n[level] = type
      return n
    })
  }, [])

  const setAllGates = useCallback((type: GateType) => {
    setLevelTypes((prev) => prev.map(() => type))
  }, [])

  // --- HORIZONTAL LAYOUT (left-to-right) ---
  const gateWidth = 70
  const gateHeight = 50
  const isNegated = (t: GateType) => t === "NAND" || t === "NOR" || t === "XNOR"
  const gateOutputOffset = (t: GateType) => gateWidth / 2 + (isNegated(t) ? 15 : 10)

  const levelSpacing = 200
  const inputSpacing = Math.max(65, 500 / numInputs)
  const startX = 80
  const svgWidth = startX + (numLevels + 1) * levelSpacing + 100
  // Extra height to give room for the draggable FF
  const svgHeight = Math.max(400, numInputs * inputSpacing + 80)

  // Input nodes are on the LEFT, spread vertically
  const getInputY = (index: number) => {
    const totalHeight = (numInputs - 1) * inputSpacing
    const topY = (svgHeight - totalHeight) / 2
    return topY + index * inputSpacing
  }

  // Gates within a level are spread vertically
  const getGateY = (gateIndex: number, totalGates: number) => {
    const spacing = totalGates > 1 ? (numInputs - 1) * inputSpacing / (totalGates - 1) : 0
    const totalHeight = (totalGates - 1) * spacing
    const topY = (svgHeight - totalHeight) / 2
    return topY + gateIndex * spacing
  }

  // Levels go left-to-right
  const getLevelX = (level: number) => startX + (level + 1) * levelSpacing

  const finalOutput =
    circuitLevels.length > 0
      ? circuitLevels[circuitLevels.length - 1].gates[
          circuitLevels[circuitLevels.length - 1].gates.length - 1
        ]?.output
      : null

  return (
    <div className="flex flex-col gap-6">
      {/* Controls panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Level count selector */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase mb-4">
            Niveles del Circuito
          </h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumLevels(Math.max(1, numLevels - 1))}
              disabled={numLevels <= 1}
              className="font-mono text-sm w-10 h-10 p-0 rounded-md"
            >
              -
            </Button>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-4xl font-mono font-bold text-primary leading-none">{numLevels}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {numInputs} entradas
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumLevels(Math.min(5, numLevels + 1))}
              disabled={numLevels >= 5}
              className="font-mono text-sm w-10 h-10 p-0 rounded-md"
            >
              +
            </Button>
          </div>
        </div>

        {/* Gate per level */}
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase">
              Compuerta por Nivel
            </h3>
            <Select onValueChange={(v) => setAllGates(v as GateType)}>
              <SelectTrigger className="w-[130px] h-7 font-mono text-[10px] bg-secondary text-secondary-foreground rounded-md">
                <SelectValue placeholder="Todas igual" />
              </SelectTrigger>
              <SelectContent>
                {GATE_TYPES.map((gt) => (
                  <SelectItem key={gt} value={gt} className="font-mono text-xs">
                    {gt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: numLevels }).map((_, level) => (
              <div key={level} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Nivel {level + 1}
                </label>
                <Select
                  value={levelTypes[level] || "AND"}
                  onValueChange={(val) => setLevelType(level, val as GateType)}
                >
                  <SelectTrigger className="w-[100px] h-9 font-mono text-xs bg-secondary text-secondary-foreground rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATE_TYPES.map((gt) => (
                      <SelectItem key={gt} value={gt} className="font-mono text-xs">
                        {gt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Binary inputs */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase">
            Entradas Binarias ({numInputs})
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllInputs(true)}
              className="font-mono text-[10px] h-7 px-3 rounded-md"
              style={{ color: "var(--signal-high)", borderColor: "color-mix(in oklch, var(--signal-high) 30%, transparent)" }}
            >
              Todo 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllInputs(false)}
              className="font-mono text-[10px] h-7 px-3 rounded-md"
              style={{ color: "var(--signal-low)", borderColor: "color-mix(in oklch, var(--signal-low) 30%, transparent)" }}
            >
              Todo 0
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={randomizeInputs}
              className="font-mono text-[10px] h-7 px-3 rounded-md"
            >
              Aleatorio
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {inputs.map((val, i) => (
            <button
              key={i}
              onClick={() => toggleInput(i)}
              className="w-11 h-11 rounded border-2 font-mono font-bold text-base transition-all duration-150"
              style={{
                borderColor: val ? "var(--signal-high)" : "var(--signal-low)",
                backgroundColor: val
                  ? "color-mix(in oklch, var(--signal-high) 12%, transparent)"
                  : "color-mix(in oklch, var(--signal-low) 12%, transparent)",
                color: val ? "var(--signal-high)" : "var(--signal-low)",
                boxShadow: val
                  ? "0 0 10px color-mix(in oklch, var(--signal-high) 40%, transparent)"
                  : "none",
              }}
              aria-label={`Entrada ${i}: ${val ? "1" : "0"}`}
            >
              {val ? "1" : "0"}
            </button>
          ))}
        </div>
      </div>

      {/* Circuit visualization -- HORIZONTAL (left to right) */}
      {circuitLevels.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="min-w-full"
            role="img"
            aria-label="Diagrama del circuito logico"
            onMouseMove={onSVGMouseMove}
            onMouseUp={onSVGMouseUp}
            onMouseLeave={onSVGMouseUp}
            onTouchMove={onSVGTouchMove}
            onTouchEnd={onSVGMouseUp}
            style={{ cursor: ff.dragging ? "grabbing" : "default" }}
          >
            {/* Dot grid background */}
            <defs>
              <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="12" cy="12" r="1" fill="var(--border)" opacity="0.35" />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#dotgrid)" />

            {/* Wires: inputs -> first level gates */}
            {circuitLevels[0]?.gates.map((_, gateIdx) => {
              const gX = getLevelX(0)
              const gY = getGateY(gateIdx, circuitLevels[0].gates.length)
              const inputIdx1 = gateIdx * 2
              const inputIdx2 = gateIdx * 2 + 1
              const gateInputX = gX - gateWidth / 2 - 10

              return (
                <React.Fragment key={`wire-in-${gateIdx}`}>
                  <Wire
                    x1={startX + 22}
                    y1={getInputY(inputIdx1)}
                    x2={gateInputX}
                    y2={gY - gateHeight * 0.25}
                    active={inputs[inputIdx1]}
                    horizontal
                  />
                  {inputIdx2 < inputs.length && (
                    <Wire
                      x1={startX + 22}
                      y1={getInputY(inputIdx2)}
                      x2={gateInputX}
                      y2={gY + gateHeight * 0.25}
                      active={inputs[inputIdx2]}
                      horizontal
                    />
                  )}
                </React.Fragment>
              )
            })}

            {/* Wires: between levels */}
            {circuitLevels.slice(1).map((level, levelIdx) => {
              const prevLevel = circuitLevels[levelIdx]
              return level.gates.map((_, gateIdx) => {
                const currGateX = getLevelX(levelIdx + 1)
                const currGateY = getGateY(gateIdx, level.gates.length)
                const prevGateIdx1 = gateIdx * 2
                const prevGateIdx2 = gateIdx * 2 + 1
                const prevType = prevLevel.type
                const currInputX = currGateX - gateWidth / 2 - 10

                return (
                  <React.Fragment key={`wire-lv-${levelIdx + 1}-${gateIdx}`}>
                    {prevGateIdx1 < prevLevel.gates.length && (
                      <Wire
                        x1={
                          getLevelX(levelIdx) +
                          gateOutputOffset(prevType) +
                          10
                        }
                        y1={getGateY(prevGateIdx1, prevLevel.gates.length)}
                        x2={currInputX}
                        y2={currGateY - gateHeight * 0.25}
                        active={prevLevel.gates[prevGateIdx1]?.output}
                        horizontal
                      />
                    )}
                    {prevGateIdx2 < prevLevel.gates.length && (
                      <Wire
                        x1={
                          getLevelX(levelIdx) +
                          gateOutputOffset(prevType) +
                          10
                        }
                        y1={getGateY(prevGateIdx2, prevLevel.gates.length)}
                        x2={currInputX}
                        y2={currGateY + gateHeight * 0.25}
                        active={prevLevel.gates[prevGateIdx2]?.output}
                        horizontal
                      />
                    )}
                  </React.Fragment>
                )
              })
            })}

            {/* Wire: last gate -> output node */}
            {circuitLevels.length > 0 &&
              (() => {
                const lastLevel = circuitLevels[circuitLevels.length - 1]
                const lastGateIdx = lastLevel.gates.length - 1
                const lastGateX = getLevelX(circuitLevels.length - 1)
                const lastGateY = getGateY(lastGateIdx, lastLevel.gates.length)
                const outputNodeX = getLevelX(circuitLevels.length) + 20
                return (
                  <Wire
                    x1={lastGateX + gateOutputOffset(lastLevel.type) + 10}
                    y1={lastGateY}
                    x2={outputNodeX - 30}
                    y2={svgHeight / 2}
                    active={finalOutput ?? false}
                    horizontal
                  />
                )
              })()}

            {/* Input nodes on the LEFT */}
            {inputs.map((val, i) => (
              <InputNode
                key={`in-${i}`}
                x={startX}
                y={getInputY(i)}
                value={val}
                label={`I${i}`}
                onClick={() => toggleInput(i)}
              />
            ))}

            {/* Gate levels */}
            {circuitLevels.map((level, levelIdx) => (
              <React.Fragment key={`lv-${levelIdx}`}>
                {/* Level label at the top */}
                <rect
                  x={getLevelX(levelIdx) - 18}
                  y={8}
                  width={36}
                  height={18}
                  rx={3}
                  fill="var(--secondary)"
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
                <text
                  x={getLevelX(levelIdx)}
                  y={21}
                  textAnchor="middle"
                  className="font-mono font-bold"
                  style={{ fontSize: "9px", fill: "var(--muted-foreground)" }}
                >
                  {`N${levelIdx + 1}`}
                </text>

                {level.gates.map((gate, gateIdx) => (
                  <LogicGateSVG
                    key={`g-${levelIdx}-${gateIdx}`}
                    type={gate.type}
                    x={getLevelX(levelIdx)}
                    y={getGateY(gateIdx, level.gates.length)}
                    output={gate.output}
                  />
                ))}
              </React.Fragment>
            ))}

            {/* Final output on the RIGHT */}
            {finalOutput !== null && (
              <OutputNode
                x={getLevelX(circuitLevels.length) + 20}
                y={svgHeight / 2}
                value={finalOutput ?? false}
              />
            )}

            {/* ── Draggable SR Flip-Flop ── */}
            <FlipFlopSVG
              x={ff.pos.x}
              y={ff.pos.y}
              q={ff.q}
              s={ff.s}
              r={ff.r}
              dragging={ff.dragging}
              onMouseDown={onFFMouseDown}
              onTouchStart={onFFTouchStart}
              onToggleS={() => toggleFFInput("s")}
              onToggleR={() => toggleFFInput("r")}
            />
          </svg>
        </div>
      )}

      {/* Results Panel */}
      {circuitLevels.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          {/* Partial results per level */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-[10px] font-mono font-bold text-muted-foreground tracking-[0.15em] uppercase mb-4">
              Resultados Parciales
            </h3>
            <div className="flex flex-col gap-3">
              {circuitLevels.map((level, levelIdx) => (
                <div key={levelIdx} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground w-10 shrink-0 uppercase">
                    N{levelIdx + 1}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground w-12 shrink-0">
                    {level.type}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {level.gates.map((gate, gateIdx) => (
                      <div key={gateIdx} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: gate.output
                              ? "var(--signal-high)"
                              : "var(--signal-low)",
                            boxShadow: gate.output
                              ? "0 0 6px var(--signal-high)"
                              : "0 0 6px var(--signal-low)",
                          }}
                          aria-label={gate.output ? "1" : "0"}
                        />
                        <span
                          className="font-mono text-xs font-bold"
                          style={{
                            color: gate.output
                              ? "var(--signal-high)"
                              : "var(--signal-low)",
                          }}
                        >
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
                borderColor: finalOutput
                  ? "var(--signal-high)"
                  : "var(--signal-low)",
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
                  backgroundColor: finalOutput
                    ? "var(--signal-high)"
                    : "var(--signal-low)",
                  boxShadow: finalOutput
                    ? "0 0 20px var(--signal-high), 0 0 40px var(--signal-high)"
                    : "0 0 20px var(--signal-low), 0 0 40px var(--signal-low)",
                }}
              />
              <span
                className="text-3xl font-mono font-bold"
                style={{
                  color: finalOutput
                    ? "var(--signal-high)"
                    : "var(--signal-low)",
                }}
              >
                {finalOutput ? "1" : "0"}
              </span>
              <span
                className="text-xs font-mono"
                style={{
                  color: finalOutput
                    ? "var(--signal-high)"
                    : "var(--signal-low)",
                }}
              >
                {finalOutput ? "VERDADERO" : "FALSO"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
