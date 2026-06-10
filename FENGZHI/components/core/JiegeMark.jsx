// 界格徽记 — 峰值永造局品牌符号
// 四等分方格 = 四界；右上格鎏金 = 识界之始。
import React from "react";

export function JiegeMark({ size = 32, reversed = false, mono = false }) {
  const stroke = reversed ? "var(--paper, #FAF7F2)" : "var(--ink, #1A1714)";
  const fill = mono ? stroke : "var(--gold, #AF8C4F)";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="峰值永造局界格徽记">
      <rect x="24" y="2" width="22" height="22" fill={fill}></rect>
      <g fill="none" stroke={stroke} strokeWidth="2">
        <rect x="2" y="2" width="44" height="44"></rect>
        <line x1="24" y1="2" x2="24" y2="46"></line>
        <line x1="2" y1="24" x2="46" y2="24"></line>
      </g>
    </svg>
  );
}
