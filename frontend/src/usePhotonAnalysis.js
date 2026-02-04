import { useState } from 'react';

export const usePhotonAnalysis = () => {
  const [hoverInfo, setHoverInfo] = useState(null);

  const handleMouseEnter = (event, rowIndex, rowData) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Position panel to the right of the row, slightly offset
    const x = rect.right + 16;
    const y = Math.max(16, rect.top - 60);

    setHoverInfo({
      rowIndex,
      rowData,
      position: { x, y },
    });
  };

  const handleMouseMove = (event, rowIndex, rowData) => {
    // Optionally update position as cursor moves
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.right + 16;
    const y = Math.max(16, rect.top - 60);

    setHoverInfo((prev) => {
      if (prev && prev.rowIndex === rowIndex) {
        return {
          ...prev,
          position: { x, y },
        };
      }
      return prev;
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return {
    hoverInfo,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  };
};
