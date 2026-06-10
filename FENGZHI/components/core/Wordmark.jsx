// Wordmark — 峰值永造局字标组合（主组合 / 横排组合）
import React from "react";
import { JiegeMark } from "./JiegeMark.jsx";

export function Wordmark({ variant = "stacked", scale = 1 }) {
  if (variant === "horizontal") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
        <JiegeMark size={18 * scale} />
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)",
          fontSize: 15 * scale + "px", letterSpacing: "0.22em",
        }}>峰值永造局</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * scale }}>
      <JiegeMark size={26 * scale} />
      <span style={{
        fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)",
        fontSize: 21 * scale + "px", letterSpacing: "0.34em", marginRight: "-0.34em",
      }}>峰值永造局</span>
      <span style={{
        fontFamily: "var(--font-western)", fontSize: 7 * scale + "px",
        letterSpacing: "0.42em", marginRight: "-0.42em", color: "var(--stone)",
      }}>THE TRANSFORMATION COMPANY</span>
    </div>
  );
}
