import React from "react";
import "./ExplanationBox.css";

/**
 * ExplanationBox Component
 * Renders a floating card beside the hovered table row
 * Displays row explanation, status badge, and quantum details
 */
export const ExplanationBox = ({ hoverInfo }) => {
  if (!hoverInfo) return null;

  const { explanation, position } = hoverInfo;

  const statusConfig = {
    eve: { label: "Eve Present", className: "status-eve" },
    mismatch: { label: "Bases Mismatch", className: "status-mismatch" },
    match: { label: "Bases Match", className: "status-match" },
  };

  const config = statusConfig[explanation.status] || statusConfig.match;

  return (
    <div
      className="explanation-popup"
      style={{
        position: "fixed",
        left: `${position.left}px`,
        top: `${position.top}px`,
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      <div className="explanation-box">
        {/* Status Badge */}
        <div className={`status-badge ${config.className}`}>
          {explanation.status === "eve" && "⚠"}
          {explanation.status === "mismatch" && "↔"}
          {explanation.status === "match" && "✓"}
          <span>{config.label}</span>
        </div>

        {/* Explanation Text */}
        <div className="explanation-content">
          <pre className="explanation-text">{explanation.text}</pre>
        </div>

        {/* Quantum Details Grid */}
        <div className="quantum-details">
          <div className="detail-row">
            <span className="detail-label">Alice:</span>
            <span className="detail-value alice-value">
              {explanation.aliceBit} ({explanation.aliceBasis})
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Bob:</span>
            <span className="detail-value bob-value">
              {explanation.bobBit}
            </span>
          </div>
          {explanation.eveIntercepting && (
            <div className="detail-row eve-row">
              <span className="detail-label">Eve:</span>
              <span className="detail-value">Intercepted</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">
              {explanation.basesMatch ? "🔐 Kept" : "🗑 Discarded"}
            </span>
          </div>
        </div>

        {/* Pointer arrow (optional, for visual connection to row) */}
        <div className="explanation-arrow"></div>
      </div>
    </div>
  );
};
