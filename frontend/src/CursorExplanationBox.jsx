import React from "react";
import "./CursorExplanationBox.css";

/**
 * CursorExplanationBox Component
 * Renders a floating card that follows the cursor position
 * Displays quantum measurement explanation and status badges
 */
export const CursorExplanationBox = ({ hoverInfo }) => {
  if (!hoverInfo) return null;

  const { explanation, position } = hoverInfo;

  const statusConfig = {
    eve: { label: "Eve Present", className: "status-eve", icon: "⚠" },
    mismatch: { label: "Bases Mismatch", className: "status-mismatch", icon: "↔" },
    match: { label: "Bases Match", className: "status-match", icon: "✓" },
  };

  const config = statusConfig[explanation.status] || statusConfig.match;

  return (
    <div
      className="cursor-explanation-popup"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      <div className="cursor-explanation-box">
        {/* Status Badge */}
        <div className={`cursor-status-badge ${config.className}`}>
          <span className="status-icon">{config.icon}</span>
          <span className="status-label">{config.label}</span>
        </div>

        {/* Explanation Text */}
        <div className="cursor-explanation-content">
          <pre className="cursor-explanation-text">{explanation.text}</pre>
        </div>

        {/* Quick Quantum Details */}
        <div className="cursor-quantum-summary">
          <div className="summary-row">
            <span className="summary-key">Alice:</span>
            <span className="summary-val">{explanation.aliceBit} ({explanation.aliceBasis})</span>
          </div>
          <div className="summary-row">
            <span className="summary-key">Bob:</span>
            <span className="summary-val">{explanation.bobBit}</span>
          </div>
          {explanation.eveIntercepting && (
            <div className="summary-row eve-highlight">
              <span className="summary-key">🔴 Eve:</span>
              <span className="summary-val">Detected</span>
            </div>
          )}
        </div>
      </div>

      {/* Small pointer dot at cursor tip */}
      <div className="cursor-pointer-dot"></div>
    </div>
  );
};
