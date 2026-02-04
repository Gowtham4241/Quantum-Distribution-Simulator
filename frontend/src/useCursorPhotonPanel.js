import { useState } from 'react';

export const useCursorPhotonPanel = () => {
  const [hoverInfo, setHoverInfo] = useState(null);

  const handleMouseEnter = (event, rowIndex, rowData) => {
    const x = event.clientX + 16;
    const y = event.clientY + 16;

    setHoverInfo({
      rowIndex,
      rowData,
      position: { x, y },
    });
  };

  const handleMouseMove = (event) => {
    setHoverInfo((prev) => {
      if (prev) {
        return {
          ...prev,
          position: { x: event.clientX + 16, y: event.clientY + 16 },
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
