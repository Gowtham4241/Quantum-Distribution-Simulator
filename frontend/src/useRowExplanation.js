import { useState } from "react";

/**
 * Custom hook for managing cursor-following explanation box
 * Tracks cursor position, generates explanation text, and manages hover state
 */
export const useRowExplanation = () => {
  const [hoverInfo, setHoverInfo] = useState(null);

  function generateExplanation(row) {
    if (!row) return { text: "", status: "neutral" };

    const aliceBit = row.aliceBit ?? row["Alice Bit"];
    const aliceBasis = row.aliceBasis ?? row["Alice Basis"];
    const bobBit = row.bobMeasuredBit ?? row["Bob Measured Bit"];
    const bobBasis = row.bobBasis ?? row["Bob Basis"];
    const eveIntercepting = row.eveIntercepting ?? row["Eve Intercepting"] === "Yes";
    const basesMatch = row.basesMatch ?? row["Bases Match"] === "Yes";

    // Determine status badge
    let status = "match";
    if (eveIntercepting) status = "eve";
    else if (!basesMatch) status = "mismatch";

    // Generate explanation lines
    const lines = [];
    lines.push(`Alice sent bit ${aliceBit} in ${aliceBasis} basis.`);

    if (eveIntercepting) {
      lines.push(`Eve intercepted and measured the photon.`);
      lines.push(`Quantum state was disturbed during measurement.`);
    } else {
      lines.push(`No interception. Photon traveled undisturbed.`);
    }

    if (bobBit !== undefined && aliceBit !== undefined) {
      if (String(bobBit) !== String(aliceBit)) {
        lines.push(`Bob measured ${bobBit} (≠ Alice's ${aliceBit}).`);
        if (eveIntercepting) {
          lines.push(`Eve's interference likely caused the error.`);
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
      lines.push(`This photon is DISCARDED during sifting.`);
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
    const explanation = generateExplanation(row);
    const cursorX = event.clientX + 16; // Offset right from cursor
    const cursorY = event.clientY + 16; // Offset down from cursor

    setHoverInfo({
      row,
      explanation,
      position: { x: cursorX, y: cursorY },
    });
  }

  function handleMouseMove(event) {
    // Smooth cursor following
    if (hoverInfo) {
      setHoverInfo((prev) => ({
        ...prev,
        position: {
          x: event.clientX + 16,
          y: event.clientY + 16,
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
