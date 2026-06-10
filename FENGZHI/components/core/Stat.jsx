// Stat — 大数字 + 注释 + 出处（每个数字必须有出处）
import React from "react";

export function Stat({ value, label, source, size = 54 }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--font-western)", fontWeight: 300,
        fontSize: size + "px", lineHeight: 1, color: "var(--ink)",
        letterSpacing: "-0.01em",
      }}>{value}</div>
      <div style={{
        fontFamily: "var(--font-body)", fontSize: "13px",
        color: "var(--ink-soft)", marginTop: "10px",
      }}>{label}</div>
      {source ? (
        <div style={{
          fontFamily: "var(--font-body)", fontSize: "11px",
          color: "var(--stone)", marginTop: "5px", letterSpacing: "0.04em",
        }}>{source}</div>
      ) : null}
    </div>
  );
}
