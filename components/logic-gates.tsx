"use client"

import React from "react"

interface GateProps {
  type: string
  x: number
  y: number
  width?: number
  height?: number
  output: boolean
}

// Standard IEEE logic gate shapes as SVG paths
function ANDGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const halfW = w / 2
  return (
    <path
      d={`M ${x - halfW} ${y - h / 2} 
          L ${x} ${y - h / 2} 
          A ${halfW} ${h / 2} 0 0 1 ${x} ${y + h / 2} 
          L ${x - halfW} ${y + h / 2} Z`}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

function ORGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const halfW = w / 2
  return (
    <path
      d={`M ${x - halfW} ${y - h / 2} 
          Q ${x - halfW + w * 0.15} ${y}, ${x - halfW} ${y + h / 2}
          Q ${x + halfW * 0.2} ${y + h / 2}, ${x + halfW} ${y}
          Q ${x + halfW * 0.2} ${y - h / 2}, ${x - halfW} ${y - h / 2} Z`}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

function XORGateBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const halfW = w / 2
  return (
    <>
      <path
        d={`M ${x - halfW - 6} ${y - h / 2} 
            Q ${x - halfW + w * 0.15 - 6} ${y}, ${x - halfW - 6} ${y + h / 2}`}
        fill="none"
        stroke="var(--gate-stroke)"
        strokeWidth={2}
      />
      <path
        d={`M ${x - halfW} ${y - h / 2} 
            Q ${x - halfW + w * 0.15} ${y}, ${x - halfW} ${y + h / 2}
            Q ${x + halfW * 0.2} ${y + h / 2}, ${x + halfW} ${y}
            Q ${x + halfW * 0.2} ${y - h / 2}, ${x - halfW} ${y - h / 2} Z`}
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
      cx={x}
      cy={y}
      r={r}
      fill="var(--gate-fill)"
      stroke="var(--gate-stroke)"
      strokeWidth={2}
    />
  )
}

export function LogicGateSVG({ type, x, y, width = 70, height = 50, output }: GateProps) {
  const halfW = width / 2
  const isNegated = type === "NAND" || type === "NOR" || type === "XNOR"

  const inputTopY = y - height * 0.25
  const inputBottomY = y + height * 0.25
  const inputX = x - halfW - 10
  const outputX = x + halfW + (isNegated ? 15 : 10)
  const outputY = y

  const glowColor = output ? "var(--signal-high)" : "var(--signal-low)"

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

      {/* Input pins */}
      <line x1={inputX} y1={inputTopY} x2={x - halfW} y2={inputTopY}
        stroke="var(--gate-stroke)" strokeWidth={2} />
      <line x1={inputX} y1={inputBottomY} x2={x - halfW} y2={inputBottomY}
        stroke="var(--gate-stroke)" strokeWidth={2} />

      {/* Gate body */}
      {(type === "AND" || type === "NAND") && <ANDGateBody x={x} y={y} w={width} h={height} />}
      {(type === "OR" || type === "NOR") && <ORGateBody x={x} y={y} w={width} h={height} />}
      {(type === "XOR" || type === "XNOR") && <XORGateBody x={x} y={y} w={width} h={height} />}

      {/* Negation bubble */}
      {isNegated && <NotBubble x={x + halfW + 6} y={y} r={5} />}

      {/* Output pin */}
      <line x1={x + halfW + (isNegated ? 11 : 0)} y1={y} x2={outputX} y2={y}
        stroke="var(--gate-stroke)" strokeWidth={2} />

      {/* Output LED indicator */}
      <circle cx={outputX + 6} cy={outputY} r={6}
        fill={glowColor} filter={`url(#glow-${x}-${y})`} opacity={0.9} />
      <circle cx={outputX + 6} cy={outputY} r={3}
        fill={output ? "#fff" : "var(--gate-fill)"} opacity={0.6} />

      {/* Gate label */}
      <text x={x - (type.length > 3 ? 14 : 10)} y={y + 4}
        className="font-mono font-bold"
        style={{ fontSize: "10px", fill: "var(--foreground)" }}>
        {type}
      </text>

      {/* Output value under gate */}
      <text x={outputX + 6} y={outputY + 18}
        textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "11px", fill: glowColor }}>
        {output ? "1" : "0"}
      </text>
    </g>
  )
}

// Standalone gate for reference/legend display
export function LogicGateIcon({ type, size = 80 }: { type: string; size?: number }) {
  const w = size
  const h = size * 0.65
  const gateW = w * 0.55
  const gateH = h * 0.7
  const cx = w / 2
  const cy = h / 2

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <LogicGateSVG type={type} x={cx} y={cy} width={gateW} height={gateH} output={true} />
    </svg>
  )
}

// Input node
export function InputNode({
  x, y, value, label, onClick,
}: {
  x: number; y: number; value: boolean; label: string; onClick?: () => void
}) {
  const color = value ? "var(--signal-high)" : "var(--signal-low)"
  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}
      role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      aria-label={`${label}: ${value ? "1" : "0"}`}>
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
      <text x={x} y={y + 5} textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "14px", fill: color }}>
        {value ? "1" : "0"}
      </text>
      <text x={x} y={y - 28} textAnchor="middle" className="font-mono"
        style={{ fontSize: "10px", fill: "var(--muted-foreground)" }}>
        {label}
      </text>
    </g>
  )
}

// Output node
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
      {/* LED ring */}
      <circle cx={x} cy={y} r={28}
        fill="none" stroke={color} strokeWidth={3}
        filter="url(#output-glow)" />
      <circle cx={x} cy={y} r={22}
        fill="var(--gate-fill)" stroke={color} strokeWidth={2} />
      {/* Inner glow */}
      <circle cx={x} cy={y} r={12}
        fill={color} opacity={0.3} />
      <circle cx={x} cy={y} r={6}
        fill={color} opacity={0.7} />
      <text x={x} y={y - 36} textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "11px", fill: "var(--muted-foreground)" }}>
        SALIDA
      </text>
      <text x={x} y={y + 6} textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "18px", fill: color }}>
        {value ? "1" : "0"}
      </text>
    </g>
  )
}

// ─── SR Flip-Flop ────────────────────────────────────────────────────────────

interface FlipFlopProps {
  x: number
  y: number
  width?: number
  height?: number
  q: boolean          // current Q state
  s: boolean          // Set input
  r: boolean          // Reset input
  dragging?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  onToggleS?: () => void
  onToggleR?: () => void
}

export function FlipFlopSVG({
  x, y,
  width = 100, height = 80,
  q, s, r,
  dragging = false,
  onMouseDown,
  onTouchStart,
  onToggleS,
  onToggleR,
}: FlipFlopProps) {
  const qBar = !q
  const hw = width / 2
  const hh = height / 2

  const bodyX = x - hw
  const bodyY = y - hh

  const colorQ    = q    ? "var(--signal-high)" : "var(--signal-low)"
  const colorQBar = qBar ? "var(--signal-high)" : "var(--signal-low)"
  const colorS    = s    ? "var(--signal-high)" : "var(--signal-low)"
  const colorR    = r    ? "var(--signal-high)" : "var(--signal-low)"

  // Pin offsets
  const pinSY    = y - hh * 0.45   // S input (top-left)
  const pinRY    = y + hh * 0.45   // R input (bottom-left)
  const pinQY    = y - hh * 0.45   // Q output (top-right)
  const pinQBarY = y + hh * 0.45   // Q̄ output (bottom-right)

  const pinLen = 22

  return (
    <g
      style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <defs>
        <filter id={`ff-glow-${x}-${y}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`ff-glow-halo-${x}-${y}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow when active */}
      {q && (
        <rect
          x={bodyX - 4} y={bodyY - 4}
          width={width + 8} height={height + 8}
          rx={10} ry={10}
          fill="none"
          stroke="var(--signal-high)"
          strokeWidth={1.5}
          opacity={0.25}
          filter={`url(#ff-glow-halo-${x}-${y})`}
        />
      )}

      {/* Main body */}
      <rect
        x={bodyX} y={bodyY}
        width={width} height={height}
        rx={7} ry={7}
        fill="var(--gate-fill)"
        stroke={q ? "var(--signal-high)" : "var(--gate-stroke)"}
        strokeWidth={2}
        filter={`url(#ff-glow-${x}-${y})`}
      />

      {/* Title */}
      <text
        x={x} y={y - 6}
        textAnchor="middle"
        className="font-mono font-bold"
        style={{ fontSize: "11px", fill: "var(--foreground)", pointerEvents: "none" }}
      >
        SR FF
      </text>
      <text
        x={x} y={y + 8}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: "8px", fill: "var(--muted-foreground)", pointerEvents: "none" }}
      >
        Flip-Flop
      </text>

      {/* ── Input pins (left side) ── */}
      {/* S pin */}
      <line x1={bodyX - pinLen} y1={pinSY} x2={bodyX} y2={pinSY}
        stroke={colorS} strokeWidth={s ? 2 : 1.2} opacity={s ? 1 : 0.4} />
      {/* S toggle button */}
      <circle
        cx={bodyX - pinLen - 10} cy={pinSY} r={9}
        fill={s ? "color-mix(in oklch, var(--signal-high) 18%, transparent)" : "var(--gate-fill)"}
        stroke={colorS} strokeWidth={2}
        style={{ cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); onToggleS?.() }}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <text
        x={bodyX - pinLen - 10} y={pinSY + 4}
        textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorS, pointerEvents: "none" }}
      >
        {s ? "1" : "0"}
      </text>
      {/* S label on body */}
      <text
        x={bodyX + 7} y={pinSY + 4}
        textAnchor="start" className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}
      >
        S
      </text>

      {/* R pin */}
      <line x1={bodyX - pinLen} y1={pinRY} x2={bodyX} y2={pinRY}
        stroke={colorR} strokeWidth={r ? 2 : 1.2} opacity={r ? 1 : 0.4} />
      {/* R toggle button */}
      <circle
        cx={bodyX - pinLen - 10} cy={pinRY} r={9}
        fill={r ? "color-mix(in oklch, var(--signal-high) 18%, transparent)" : "var(--gate-fill)"}
        stroke={colorR} strokeWidth={2}
        style={{ cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); onToggleR?.() }}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <text
        x={bodyX - pinLen - 10} y={pinRY + 4}
        textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorR, pointerEvents: "none" }}
      >
        {r ? "1" : "0"}
      </text>
      {/* R label on body */}
      <text
        x={bodyX + 7} y={pinRY + 4}
        textAnchor="start" className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}
      >
        R
      </text>

      {/* ── Output pins (right side) ── */}
      {/* Q pin */}
      <line x1={bodyX + width} y1={pinQY} x2={bodyX + width + pinLen} y2={pinQY}
        stroke={colorQ} strokeWidth={q ? 2.5 : 1.2} opacity={q ? 1 : 0.35} />
      {/* Q LED */}
      <circle
        cx={bodyX + width + pinLen + 8} cy={pinQY} r={7}
        fill={colorQ} opacity={0.8}
        filter={q ? `url(#ff-glow-${x}-${y})` : undefined}
      />
      <circle cx={bodyX + width + pinLen + 8} cy={pinQY} r={3.5}
        fill={q ? "#fff" : "var(--gate-fill)"} opacity={0.6} />
      {/* Q label on body */}
      <text
        x={bodyX + width - 7} y={pinQY + 4}
        textAnchor="end" className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}
      >
        Q
      </text>
      <text
        x={bodyX + width + pinLen + 8} y={pinQY + 19}
        textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorQ, pointerEvents: "none" }}
      >
        {q ? "1" : "0"}
      </text>

      {/* Q̄  pin (with negation bubble) */}
      <line x1={bodyX + width} y1={pinQBarY} x2={bodyX + width + pinLen - 6} y2={pinQBarY}
        stroke={colorQBar} strokeWidth={qBar ? 2.5 : 1.2} opacity={qBar ? 1 : 0.35} />
      {/* Negation bubble */}
      <circle
        cx={bodyX + width + pinLen - 1} cy={pinQBarY} r={5}
        fill="var(--gate-fill)" stroke={colorQBar} strokeWidth={1.5} opacity={qBar ? 1 : 0.5}
      />
      <line x1={bodyX + width + pinLen + 4} y1={pinQBarY} x2={bodyX + width + pinLen + 8} y2={pinQBarY}
        stroke={colorQBar} strokeWidth={qBar ? 2.5 : 1.2} opacity={qBar ? 1 : 0.35} />
      {/* Q̄ LED */}
      <circle
        cx={bodyX + width + pinLen + 15} cy={pinQBarY} r={7}
        fill={colorQBar} opacity={0.8}
        filter={qBar ? `url(#ff-glow-${x}-${y})` : undefined}
      />
      <circle cx={bodyX + width + pinLen + 15} cy={pinQBarY} r={3.5}
        fill={qBar ? "#fff" : "var(--gate-fill)"} opacity={0.6} />
      {/* Q̄ label on body */}
      <text
        x={bodyX + width - 7} y={pinQBarY + 4}
        textAnchor="end" className="font-mono font-bold"
        style={{ fontSize: "9px", fill: "var(--muted-foreground)", pointerEvents: "none" }}
      >
        Q̄
      </text>
      <text
        x={bodyX + width + pinLen + 15} y={pinQBarY + 19}
        textAnchor="middle" className="font-mono font-bold"
        style={{ fontSize: "10px", fill: colorQBar, pointerEvents: "none" }}
      >
        {qBar ? "1" : "0"}
      </text>

      {/* Drag handle hint */}
      <text
        x={x} y={bodyY - 7}
        textAnchor="middle"
        style={{ fontSize: "7px", fill: "var(--muted-foreground)", opacity: 0.6, pointerEvents: "none" }}
      >
        ⠿ arrastrar
      </text>
    </g>
  )
}

// Standalone icon for reference panel
export function FlipFlopIcon({ size = 80 }: { size?: number }) {
  const w = size
  const h = size * 0.65
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Simplified FF shape for icon */}
      <rect x={w * 0.25} y={h * 0.1} width={w * 0.5} height={h * 0.8}
        rx={5} fill="var(--gate-fill)" stroke="var(--gate-stroke)" strokeWidth={2} />
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
      <line x1={w * 0.75} y1={h * 0.7} x2={w * 0.9} y2={h * 0.7}
        stroke="var(--signal-low)" strokeWidth={1.5} opacity={0.8} />
      <circle cx={w * 0.91} cy={h * 0.3} r={3.5} fill="var(--signal-high)" opacity={0.8} />
      <circle cx={w * 0.92} cy={h * 0.7} r={5} fill="none"
        stroke="var(--signal-low)" strokeWidth={1.5} opacity={0.6} />
    </svg>
  )
}

// Wire -- orthogonal routing with a small corner radius for a "technical" look
export function Wire({
  x1, y1, x2, y2, active, horizontal = false,
}: {
  x1: number; y1: number; x2: number; y2: number; active: boolean; horizontal?: boolean
}) {
  const color = active ? "var(--wire-active)" : "var(--wire-inactive)"
  const r = 6 // corner rounding radius (small -- keeps it crisp)

  let d: string
  if (horizontal) {
    // Route: go right to midX, bend 90 degrees, go to target Y, bend 90 degrees, arrive
    const midX = (x1 + x2) / 2
    const dy = y2 - y1
    if (Math.abs(dy) < 1) {
      // Straight horizontal
      d = `M ${x1} ${y1} L ${x2} ${y2}`
    } else {
      const sign = dy > 0 ? 1 : -1
      const absD = Math.abs(dy)
      const cr = Math.min(r, absD / 2, Math.abs(midX - x1) / 2)
      d = `M ${x1} ${y1} L ${midX - cr} ${y1} Q ${midX} ${y1}, ${midX} ${y1 + sign * cr} L ${midX} ${y2 - sign * cr} Q ${midX} ${y2}, ${midX + cr} ${y2} L ${x2} ${y2}`
    }
  } else {
    const midY = (y1 + y2) / 2
    const dx = x2 - x1
    if (Math.abs(dx) < 1) {
      d = `M ${x1} ${y1} L ${x2} ${y2}`
    } else {
      const sign = dx > 0 ? 1 : -1
      const absD = Math.abs(dx)
      const cr = Math.min(r, absD / 2, Math.abs(midY - y1) / 2)
      d = `M ${x1} ${y1} L ${x1} ${midY - cr} Q ${x1} ${midY}, ${x1 + sign * cr} ${midY} L ${x2 - sign * cr} ${midY} Q ${x2} ${midY}, ${x2} ${midY + cr} L ${x2} ${y2}`
    }
  }

  return (
    <>
      <path
        d={d}
        fill="none" stroke={color}
        strokeWidth={active ? 2 : 1.2}
        opacity={active ? 1 : 0.35}
        strokeLinejoin="round"
      />
      {active && (
        <path
          d={d}
          fill="none" stroke={color}
          strokeWidth={6} opacity={0.1}
          strokeLinejoin="round"
        />
      )}
    </>
  )
}
