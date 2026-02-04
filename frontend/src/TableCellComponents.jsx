import React from 'react';

// Circular badge for displaying bits (0 or 1)
export const BitBadge = ({ bit }) => (
  <span className={`bit-badge bit-badge-${bit}`}>
    {bit}
  </span>
);

// Rounded square badge for basis symbols (+ or ×)
export const BasisBadge = ({ basis }) => {
  const isPlus = basis?.includes('+') || basis === '+';
  return (
    <span className={`basis-badge basis-badge-${isPlus ? 'plus' : 'cross'}`}>
      {isPlus ? '+' : '×'}
    </span>
  );
};

// Eve bit display (shows "-" if not intercepted, badge if intercepted)
export const EveBitDisplay = ({ eveBit, eveIntercepting }) => {
  if (!eveIntercepting || eveBit === null || eveBit === undefined) {
    return <span className="eve-bit-dash">−</span>;
  }
  return <BitBadge bit={eveBit} />;
};

// Text display for Yes/No columns
export const YesNoText = ({ value }) => (
  <span className="yes-no-text">
    {value === 'Yes' || value === true ? 'Yes' : 'No'}
  </span>
);
