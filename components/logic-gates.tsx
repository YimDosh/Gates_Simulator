"use client"

import React from "react"

// ── Gate body shapes ───────────────────────────────────────────────────────────

interface GateProps {
  type:    string
  x:       number
  y:       number
  width?:  number
  height?: number
  output:  boolean
}

function ANDGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const hw = w / 2
  return (
    <path
      d={`M ${x - hw} ${y - h / 2}
          L ${x}      ${y - h / 2}
          A ${hw} ${h / 2} 0 0 1 ${x} ${y + h / 2}
          L ${x - hw} ${y + h / 2} Z`}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

function ORGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const hw = w / 2
  return (
    <path
      d={`M ${x - hw} ${y - h / 2}
          Q ${x - hw + w * 0.15} ${y}, ${x - hw} ${y + h / 2}
          Q ${x + hw * 0.2}      ${y + h / 2}, ${x + hw} ${y}
          Q ${x + hw * 0.2}      ${y - h / 2}, ${x - hw} ${y - h / 2} Z`}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

function XORGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const hw = w / 2
  return (
    <>
      {/* Extra curved stroke for XOR */}
      <path
        d={`M ${x - hw - 6} ${y - h / 2}
            Q ${x - hw + w * 0.15 - 6} ${y}, ${x - hw - 6} ${y + h / 2}`}
        fill="none"
        stroke="var(--gate-stroke)"
        strokeWidth={2}
      />
      <path
        d={`M ${x - hw} ${y - h / 2}
            Q ${x - hw + w * 0.15} ${y}, ${x - hw} ${y + h / 2}
            Q ${x + hw * 0.2}      ${y + h / 2}, ${x + hw} ${y}
            Q ${x + hw * 0.2}      ${y - h / 2}, ${x - hw} ${y - h / 2} Z`}
        fill="var(--gate-fill)"
        stroke="var(--gate-stroke)"
        strokeWidth={2}
      />
    </>
  )
}

function NotBubble({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return (
    <circle
      cx={x} cy={y} r={r}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

// ── Logic gate SVG (used inside the circuit diagram) ─────────────────────────

export function LogicGateSVG({ type, x, y, width = 70, height = 50, output }: GateProps) {
  const hw         = width / 2
  const isNegated  = type === "NAND" || type === "NOR" || type === "XNOR"
  const inputTopY  = y - height * 0.25
  const inputBotY  = y + height * 0.25
  const inputX     = x - hw - 10
  const outputX    = x + hw + (isNegated ? 15 : 10)
  const glowColor  = output ? "var(--signal-high)" : "var(--signal-low)"

  return (
    <g>
      <defs>
        <filter id={`glow-${x}-${y}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Input stubs */}
      <line x1={inputX} y1={inputTopY} x2={x - hw} y2={inputTopY}
        stroke="var(--gate-stroke)" strokeWidth={2} />
      <line x1={inputX} y1={inputBotY} x2={x - hw} y2={inputBotY}
        stroke="var(--gate-stroke)" strokeWidth={2} />

      {/* Gate body */}
      {(type === "AND"  || type === "NAND") && <ANDGateBody x={x} y={y} w={width} h={height} />}
      {(type === "OR"   || type === "NOR")  && <ORGateBody  x={x} y={y} w={width} h={height} />}
      {(type === "XOR"  || type === "XNOR") && <XORGateBody x={x} y={y} w={width} h={height} />}

      {/* Negation bubble */}
      {isNegated && <NotBubble x={x + hw + 6} y={y} r={5} />}

      {/* Output stub */}
      <line
        x1={x + hw + (isNegated ? 11 : 0)} y1={y}
        x2={outputX}                        y2={y}
        stroke="var(--gate-stroke)" strokeWidth={2}
      />

      {/* Output LED dot */}
      <circle cx={outputX + 6} cy={y} r={6}
        fill={glowColor} filter={`url(#glow-${x}-${y})`} opacity={0.9} />
      <circle cx={outputX + 6} cy={y} r={3}
        fill={output ? "#fff" : "var(--gate-fill)"} opacity={0.6} />

      {/* Gate type label */}
      <text
        x={x - (type.length > 3 ? 14 : 10)} y={y + 4}
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: "var(--foreground)", pointerEvents: "none" }}
      >
        {type}
      </text>

      {/* Output value */}
      <text
        x={outputX + 6} y={y + 18}
        textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "11px", fill: glowColor, pointerEvents: "none" }}
      >
        {output ? "1" : "0"}
      </text>
    </g>
  )
}

// ── Standalone gate icon (used in the reference panel) ───────────────────────

export function LogicGateIcon({ type, size = 80 }: { type: string; size?: number }) {
  const w    = size
  const h    = size * 0.65
  const gateW = w * 0.55
  const gateH = h * 0.7
  const cx   = w / 2
  const cy   = h / 2
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <LogicGateSVG type={type} x={cx} y={cy} width={gateW} height={gateH} output={true} />
    </svg>
  )
}

// ── Input node ────────────────────────────────────────────────────────────────

export function InputNode({
  x, y, value, label, onClick,
}: {
  x: number; y: number; value: boolean; label: string; onClick?: () => void
}) {
  const color = value ? "var(--signal-high)" : "var(--signal-low)"
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${label}: ${value ? "1" : "0"}`}
    >
      <defs>
        <filter id={`input-glow-${x}-${y}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={x} cy={y} r={20}
        fill="var(--gate-fill)" stroke={color} strokeWidth={2.5}
        filter={`url(#input-glow-${x}-${y})`} />
      <text x={x} y={y + 5} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "14px", fill: color, pointerEvents: "none" }}>
        {value ? "1" : "0"}
      </text>
      <text x={x} y={y - 28} textAnchor="middle"
        className="font-mono"
        style={{ fontSize: "10px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        {label}
      </text>
    </g>
  )
}

// ── Output node ───────────────────────────────────────────────────────────────

export function OutputNode({ x, y, value }: { x: number; y: number; value: boolean }) {
  const color = value ? "var(--signal-high)" : "var(--signal-low)"
  return (
    <g>
      <defs>
        <filter id="output-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={x} cy={y} r={28}
        fill="none" stroke={color} strokeWidth={3}
        filter="url(#output-glow)" />
      <circle cx={x} cy={y} r={22}
        fill="var(--gate-fill)" stroke={color} strokeWidth={2} />
      <circle cx={x} cy={y} r={12}
        fill={color} opacity={0.3} />
      <circle cx={x} cy={y} r={6}
        fill={color} opacity={0.7} />
      <text x={x} y={y - 36} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "11px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        SALIDA
      </text>
      <text x={x} y={y + 6} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "18px", fill: color, pointerEvents: "none" }}>
        {value ? "1" : "0"}
      </text>
    </g>
  )
}

// ── SR Flip-Flop SVG ─────────────────────────────────────────────────────────

interface FlipFlopProps {
  x:             number
  y:             number
  width?:        number
  height?:       number
  q:             boolean        // current Q output (latch memory)
  s:             boolean        // S input (driven by source gate — display only)
  r:             boolean        // R input (manual reset)
  dragging?:     boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onToggleR?:    () => void
}

export function FlipFlopSVG({
  x, y,
  width    = 100,
  height   = 80,
  q, s, r,
  dragging = false,
  onPointerDown,
  onToggleR,
}: FlipFlopProps) {
  const qBar  = !q
  const hw    = width  / 2
  const hh    = height / 2
  const bX    = x - hw
  const bY    = y - hh

  const colorQ    = q    ? "var(--signal-high)" : "var(--signal-low)"
  const colorQBar = qBar ? "var(--signal-high)" : "var(--signal-low)"
  const colorS    = s    ? "var(--signal-high)" : "var(--signal-low)"
  const colorR    = r    ? "var(--signal-high)" : "var(--signal-low)"

  const pinLen = 22
  const pinSY  = y - hh * 0.45   // S input pin Y (top-left)
  const pinRY  = y + hh * 0.45   // R input pin Y (bottom-left)
  const pinQY  = y - hh * 0.45   // Q output pin Y (top-right)
  const pinQBY = y + hh * 0.45   // Q̄ output pin Y (bottom-right)

  return (
    <g
      style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
      onPointerDown={onPointerDown}
    >
      <defs>
        <filter id={`ff-glow-${x}-${y}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`ff-halo-${x}-${y}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer halo when Q = 1 */}
      {q && (
        <rect
          x={bX - 4} y={bY - 4}
          width={width + 8} height={height + 8}
          rx={10} ry={10}
          fill="none"
          stroke="var(--signal-high)"
          strokeWidth={1.5}
          opacity={0.25}
          filter={`url(#ff-halo-${x}-${y})`}
        />
      )}

      {/* Main body */}
      <rect
        x={bX} y={bY}
        width={width} height={height}
        rx={7} ry={7}
        fill="var(--gate-fill)"
        stroke={q ? "var(--signal-high)" : "var(--gate-stroke)"}
        strokeWidth={2}
        filter={`url(#ff-glow-${x}-${y})`}
      />

      {/* Title */}
      <text x={x} y={y - 6} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "11px", fill: "var(--foreground)", pointerEvents: "none" }}>
        SR FF
      </text>
      <text x={x} y={y + 8} textAnchor="middle"
        className="font-mono"
        style={{ fontSize: "8px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        Flip-Flop
      </text>

      {/* ── S pin (left-top) — driven by circuit, read-only ────────────── */}
      <line x1={bX - pinLen} y1={pinSY} x2={bX} y2={pinSY}
        stroke={colorS} strokeWidth={s ? 2.2 : 1.2} opacity={s ? 1 : 0.4} />
      {/* S value indicator (display only) */}
      <rect
        x={bX - pinLen - 22} y={pinSY - 9}
        width={18} height={18} rx={3}
        fill={s
          ? "color-mix(in oklch, var(--signal-high) 18%, transparent)"
          : "var(--gate-fill)"}
        stroke={colorS} strokeWidth={1.5}
        opacity={s ? 1 : 0.55}
      />
      <text x={bX - pinLen - 13} y={pinSY + 4} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorS, pointerEvents: "none" }}>
        {s ? "1" : "0"}
      </text>
      {/* "circuit" micro-label */}
      <text x={bX - pinLen - 13} y={pinSY - 13} textAnchor="middle"
        style={{ fontSize: "6px", fill: "var(--muted-foreground)", opacity: 0.7, pointerEvents: "none" }}>
        circuito
      </text>
      <text x={bX + 7} y={pinSY + 4} textAnchor="start"
        className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        S
      </text>

      {/* ── R pin (left-bottom) — interactive toggle button ────────────── */}
      <line x1={bX - pinLen} y1={pinRY} x2={bX} y2={pinRY}
        stroke={colorR} strokeWidth={r ? 2 : 1.2} opacity={r ? 1 : 0.4} />
      {/* R indicator — interactive only when onToggleR is provided */}
      <circle
        cx={bX - pinLen - 10} cy={pinRY} r={9}
        fill={r
          ? "color-mix(in oklch, var(--signal-high) 18%, transparent)"
          : "var(--gate-fill)"}
        stroke={colorR} strokeWidth={2}
        style={{ cursor: onToggleR ? "pointer" : "default" }}
        onClick={e => { e.stopPropagation(); onToggleR?.() }}
        onPointerDown={e => e.stopPropagation()}
      />
      <text x={bX - pinLen - 10} y={pinRY + 4} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorR, pointerEvents: "none" }}>
        {r ? "1" : "0"}
      </text>
      <text x={bX + 7} y={pinRY + 4} textAnchor="start"
        className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        R
      </text>

      {/* ── Q pin (right-top) ─────────────────────────────────────────── */}
      <line x1={bX + width} y1={pinQY} x2={bX + width + pinLen} y2={pinQY}
        stroke={colorQ} strokeWidth={q ? 2.5 : 1.2} opacity={q ? 1 : 0.35} />
      <circle cx={bX + width + pinLen + 8} cy={pinQY} r={7}
        fill={colorQ} opacity={0.8}
        filter={q ? `url(#ff-glow-${x}-${y})` : undefined} />
      <circle cx={bX + width + pinLen + 8} cy={pinQY} r={3.5}
        fill={q ? "#fff" : "var(--gate-fill)"} opacity={0.6} />
      <text x={bX + width - 7} y={pinQY + 4} textAnchor="end"
        className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        Q
      </text>
      <text x={bX + width + pinLen + 8} y={pinQY + 19} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorQ, pointerEvents: "none" }}>
        {q ? "1" : "0"}
      </text>

      {/* ── Q̄ pin (right-bottom) with negation bubble ──────────────────── */}
      <line x1={bX + width} y1={pinQBY} x2={bX + width + pinLen - 6} y2={pinQBY}
        stroke={colorQBar} strokeWidth={qBar ? 2.5 : 1.2} opacity={qBar ? 1 : 0.35} />
      <circle cx={bX + width + pinLen - 1} cy={pinQBY} r={5}
        fill="var(--gate-fill)" stroke={colorQBar} strokeWidth={1.5} opacity={qBar ? 1 : 0.5} />
      <line x1={bX + width + pinLen + 4} y1={pinQBY} x2={bX + width + pinLen + 8} y2={pinQBY}
        stroke={colorQBar} strokeWidth={qBar ? 2.5 : 1.2} opacity={qBar ? 1 : 0.35} />
      <circle cx={bX + width + pinLen + 15} cy={pinQBY} r={7}
        fill={colorQBar} opacity={0.8}
        filter={qBar ? `url(#ff-glow-${x}-${y})` : undefined} />
      <circle cx={bX + width + pinLen + 15} cy={pinQBY} r={3.5}
        fill={qBar ? "#fff" : "var(--gate-fill)"} opacity={0.6} />
      <text x={bX + width - 7} y={pinQBY + 4} textAnchor="end"
        className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}>
        Q̄
      </text>
      <text x={bX + width + pinLen + 15} y={pinQBY + 19} textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorQBar, pointerEvents: "none" }}>
        {qBar ? "1" : "0"}
      </text>

      {/* Drag handle hint */}
      <text x={x} y={bY - 7} textAnchor="middle"
        style={{ fontSize: "7px", fill: "var(--muted-foreground)", opacity: 0.6, pointerEvents: "none" }}>
        ⠿ arrastrar
      </text>
    </g>
  )
}

// ── Standalone FF icon for the reference panel ────────────────────────────────

export function FlipFlopIcon({ size = 80 }: { size?: number }) {
  const w = size
  const h = size * 0.65
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <rect
        x={w * 0.25} y={h * 0.1}
        width={w * 0.5} height={h * 0.8}
        rx={5}
        fill="var(--gate-fill)" stroke="var(--gate-stroke)" strokeWidth={2}
      />
      <text x={w * 0.5} y={h * 0.48} textAnchor="middle"
        style={{ fontSize: `${size * 0.13}px`, fill: "var(--foreground)", fontFamily: "monospace", fontWeight: "bold" }}>
        SR
      </text>
      <text x={w * 0.5} y={h * 0.67} textAnchor="middle"
        style={{ fontSize: `${size * 0.1}px`, fill: "var(--muted-foreground)", fontFamily: "monospace" }}>
        FF
      </text>
      {/* Input stubs */}
      <line x1={w * 0.1} y1={h * 0.3} x2={w * 0.25} y2={h * 0.3}
        stroke="var(--gate-stroke)" strokeWidth={1.5} />
      <line x1={w * 0.1} y1={h * 0.7} x2={w * 0.25} y2={h * 0.7}
        stroke="var(--gate-stroke)" strokeWidth={1.5} />
      {/* Output stubs */}
      <line x1={w * 0.75} y1={h * 0.3} x2={w * 0.9} y2={h * 0.3}
        stroke="var(--signal-high)" strokeWidth={1.5} opacity={0.8} />
      <circle cx={w * 0.91} cy={h * 0.3} r={3.5}
        fill="var(--signal-high)" opacity={0.8} />
      <line x1={w * 0.75} y1={h * 0.7} x2={w * 0.9} y2={h * 0.7}
        stroke="var(--signal-low)" strokeWidth={1.5} opacity={0.8} />
      <circle cx={w * 0.92} cy={h * 0.7} r={5}
        fill="none" stroke="var(--signal-low)" strokeWidth={1.5} opacity={0.6} />
    </svg>
  )
}

// ── Wire — orthogonal routing with rounded corners ────────────────────────────

export function Wire({
  x1, y1, x2, y2, active, horizontal = false,
}: {
  x1: number; y1: number; x2: number; y2: number
  active: boolean; horizontal?: boolean
}) {
  const color = active ? "var(--wire-active)" : "var(--wire-inactive)"
  const r     = 6

  let d: string
  if (horizontal) {
    const midX = (x1 + x2) / 2
    const dy   = y2 - y1
    if (Math.abs(dy) < 1) {
      d = `M ${x1} ${y1} L ${x2} ${y2}`
    } else {
      const sign = dy > 0 ? 1 : -1
      const cr   = Math.min(r, Math.abs(dy) / 2, Math.abs(midX - x1) / 2)
      d = `M ${x1} ${y1} L ${midX - cr} ${y1} Q ${midX} ${y1}, ${midX} ${y1 + sign * cr} L ${midX} ${y2 - sign * cr} Q ${midX} ${y2}, ${midX + cr} ${y2} L ${x2} ${y2}`
    }
  } else {
    const midY = (y1 + y2) / 2
    const dx   = x2 - x1
    if (Math.abs(dx) < 1) {
      d = `M ${x1} ${y1} L ${x2} ${y2}`
    } else {
      const sign = dx > 0 ? 1 : -1
      const cr   = Math.min(r, Math.abs(dx) / 2, Math.abs(midY - y1) / 2)
      d = `M ${x1} ${y1} L ${x1} ${midY - cr} Q ${x1} ${midY}, ${x1 + sign * cr} ${midY} L ${x2 - sign * cr} ${midY} Q ${x2} ${midY}, ${x2} ${midY + cr} L ${x2} ${y2}`
    }
  }

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.2}
        opacity={active ? 1 : 0.35}
        strokeLinejoin="round"
      />
      {active && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={6}
          opacity={0.1}
          strokeLinejoin="round"
        />
      )}
    </>
  )
}
