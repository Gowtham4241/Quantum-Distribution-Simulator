import { useState } from "react";

/**
 * Custom hook for managing hover explanation popup behavior
 * Tracks hovered row, calculates position using getBoundingClientRect,
 * generates explanation text from row data
 */
export const useHoverExplanation = (boxWidth = 340) => {
  const [hoverInfo, setHoverInfo] = useState(null);

  function generateExplanation(row) {
    if (!row) return { text: "", status: "neutral" };

    const aliceBit = row.aliceBit ?? row["Alice Bit"];
    const aliceBasis = row.aliceBasis ?? row["Alice Basis"];
    const bobBit = row.bobMeasuredBit ?? row["Bob Measured Bit"];
    const bobBasis = row.bobBasis ?? row["Bob Basis"];
    const eveIntercepting = row.eveIntercepting ?? row["Eve Intercepting"] === "Yes";
    const basesMatch = row.basesMatch ?? row["Bases Match"] === "Yes";

    // Determine status badge color
    let status = "match";
    if (eveIntercepting) status = "eve";
    else if (!basesMatch) status = "mismatch";

    // Generate explanation lines
    const lines = [];
    lines.push(`Alice sent bit ${aliceBit} in ${aliceBasis} basis.`);

    if (eveIntercepting) {
      lines.push(`Eve intercepted and measured the photon.`);
      lines.push(`This introduced disturbance to the quantum state.`);
    }

    if (bobBit !== undefined && aliceBit !== undefined) {
      if (String(bobBit) !== String(aliceBit)) {
        lines.push(`Bob measured ${bobBit} (different from Alice's ${aliceBit}).`);
        if (eveIntercepting) {
          lines.push(`Eve's measurement likely caused this discrepancy.`);
        }
      } else {
        lines.push(`Bob measured ${bobBit}, matching Alice's bit.`);
      }
    }

    if (basesMatch) {
      lines.push(`✓ Bases matched (${aliceBasis} = ${bobBasis}).`);
      lines.push(`This photon is KEPT in the sifted key.`);
    } else {
      lines.push(`✗ Bases differed (${aliceBasis} ≠ ${bobBasis}).`);
      lines.push(`This photon is DISCARDED.`);
    }

    return {
      text: lines.join("\n"),
      status,
      aliceBit,
      aliceBasis,
      bobBit,
      eveIntercepting,
      basesMatch,
    };
  }

  function handleMouseEnter(event, row) {
    const rect = event.currentTarget.getBoundingClientRect();
    const explanation = generateExplanation(row);

    // Calculate position: try to show on right, fallback to left
    const spaceOnRight = window.innerWidth - rect.right;
    const showOnRight = spaceOnRight > boxWidth + 20;
    const left = showOnRight
      ? rect.right + 16
      : Math.max(12, rect.left - boxWidth - 16);

    const top = rect.top + rect.height / 2 - 60; // Vertically center roughly

    setHoverInfo({
      row,
      explanation,
      position: { left, top },
      showOnRight,
    });
  }

  function handleMouseMove(event) {
    // Optional: smooth vertical follow
    if (hoverInfo) {
      setHoverInfo((prev) => ({
        ...prev,
        position: {
          ...prev.position,
          top: event.clientY - 60,
        },
      }));
    }
  }

  function handleMouseLeave() {
    setHoverInfo(null);
  }

  return {
    hoverInfo,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  };
};
