// Kicker — 大字距眉题小字（中英皆可）
import React from "react";

export function Kicker({ children, gold = false, size = 11 }) {
  return (
    <div style={{
      fontFamily: "var(--font-western)",
      fontSize: size + "px",
      letterSpacing: "var(--track-kicker)",
      color: gold ? "var(--gold-deep)" : "var(--stone)",
    }}>{children}</div>
  );
}
