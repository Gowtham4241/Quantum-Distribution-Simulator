import React from "react";
import "./ModeToggle.css";

/**
 * ModeToggle Component
 * Accessible toggle switch for Classical/Quantum mode switching
 * Positioned at top-right of header with smooth animations
 */
export const ModeToggle = ({ mode, isQuantumMode, onToggle }) => {
  const handleClick = () => {
    onToggle();
  };

  const handleKeyPress = (e) => {
    // Support Space and Enter keys for accessibility
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="mode-toggle-container">
      <button
        className={`mode-toggle ${isQuantumMode ? "quantum-active" : "classical-active"}`}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        role="switch"
        aria-checked={isQuantumMode}
        aria-label={`Mode toggle: Currently in ${mode} mode. Press to switch to ${
          isQuantumMode ? "Classical" : "Quantum"
        } mode`}
        tabIndex={0}
      >
        <div className="toggle-track">
          <div className="toggle-thumb"></div>
        </div>
        <span className="mode-label">
          <span className="mode-icon">
            {isQuantumMode ? "⚛" : "⚙"}
          </span>
          <span className="mode-text">
            {isQuantumMode ? "Quantum Mode" : "Classical Mode"}
          </span>
        </span>
      </button>
    </div>
  );
};

export default ModeToggle;
