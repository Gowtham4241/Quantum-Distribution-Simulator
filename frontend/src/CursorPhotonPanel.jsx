import React from 'react';
import './CursorPhotonPanel.css';

export const CursorPhotonPanel = ({ hoverInfo }) => {
  if (!hoverInfo) return null;

  const { rowIndex, rowData, position } = hoverInfo;
  const photonNumber = rowIndex + 1;

  // Determine status badges
  const badges = [];
  if (rowData.eveIntercepting) {
    badges.push({ type: 'eve', label: 'Eve Present' });
  }
  if (rowData.basesMatch === false) {
    badges.push({ type: 'mismatch', label: 'Bases Mismatch' });
  }
  if (rowData.basesMatch === true) {
    badges.push({ type: 'match', label: 'Bases Match' });
  }

  // Generate explanation paragraphs
  const paragraphs = [];

  if (rowData.basesMatch === false) {
    paragraphs.push(
      'Bases differed — Bob measured in a different basis, which yields an uncorrelated (random) result.'
    );
  }

  if (rowData.eveIntercepting) {
    paragraphs.push(
      `Eve intercepted this photon and measured it (reported bit: ${rowData.aliceBit}). Her measurement collapsed the quantum state and may have changed the bit.`
    );
  }

  if (rowData.basesMatch === false) {
    paragraphs.push(
      'This photon is discarded during sifting because bases differed.'
    );
  } else if (rowData.basesMatch === true) {
    paragraphs.push(
      'This photon is kept and contributes to key generation and QBER estimation.'
    );
  }

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return (
    <div className="cursor-photon-panel" style={style}>
      {/* Header */}
      <div className="panel-header">
        <h3 className="panel-title">Photon {photonNumber} Analysis</h3>
      </div>

      {/* Status Badges */}
      {badges.length > 0 && (
        <div className="panel-badges">
          {badges.map((badge, idx) => (
            <span key={idx} className={`status-badge badge-${badge.type}`}>
              {badge.type === 'eve' && '●'} {badge.type === 'mismatch' && '✕'}{' '}
              {badge.type === 'match' && '✓'} {badge.label}
            </span>
          ))}
        </div>
      )}

      {/* Body Text */}
      <div className="panel-body">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="panel-paragraph">
            {para}
          </p>
        ))}
      </div>

      {/* Footer Badges */}
      <div className="panel-footer">
        <div className="footer-badge badge-alice">
          Alice: {rowData.aliceBit}
        </div>
        <div className="footer-arrow">→</div>
        <div className="footer-badge badge-bob">
          Bob: {rowData.bobMeasuredBit}
        </div>
      </div>
    </div>
  );
};
