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
