// PageChrome — 页眉/页脚细线条（deck 与文档共用）
import React from "react";

export function PageChrome({ left, right, position = "top" }) {
  const border = position === "top"
    ? { borderBottom: "1px solid var(--line)", paddingBottom: "12px" }
    : { borderTop: "1px solid var(--line)", paddingTop: "12px" };
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      fontFamily: "var(--font-body)", fontSize: "11px",
      letterSpacing: "0.2em", color: "var(--stone)", ...border,
    }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
