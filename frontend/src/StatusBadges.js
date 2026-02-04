import React from "react";
import { motion } from "framer-motion";

const StatusBadges = ({ qber, siftedKey }) => {
  // Determine Quantum Channel status based on QBER
  const qberValue = parseFloat(qber);
  const isSecureChannel = qberValue <= 20 && siftedKey.length > 0;
  const isCompromised = qberValue > 20;

  // Determine Key Status
  const hasValidKey = siftedKey.length > 0;

  return (
    <div className="status-badges-container">
      <motion.div
        className={`status-badge quantum-channel-badge ${
          isSecureChannel ? "secure" : isCompromised ? "compromised" : "pending"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="badge-icon">
          {isSecureChannel && "🛡️"}
          {isCompromised && "⚠️"}
          {!isSecureChannel && !isCompromised && "📡"}
        </div>
        <div className="badge-content">
          <div className="badge-label">Quantum Channel</div>
          <div className="badge-status">
            {isSecureChannel && (
              <>
                <span className="status-indicator secure"></span>
                Secure
              </>
            )}
            {isCompromised && (
              <>
                <span className="status-indicator compromised"></span>
                Compromised
              </>
            )}
            {!isSecureChannel && !isCompromised && (
              <>
                <span className="status-indicator pending"></span>
                Initializing
              </>
            )}
          </div>
        </div>
        <div className="badge-detail">
          QBER: {qber}%
        </div>
      </motion.div>

      <motion.div
        className={`status-badge key-status-badge ${
          hasValidKey ? "valid" : "invalid"
        }`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="badge-icon">
          {hasValidKey && "🔑"}
          {!hasValidKey && "⭕"}
        </div>
        <div className="badge-content">
          <div className="badge-label">Key Status</div>
          <div className="badge-status">
            {hasValidKey && (
              <>
                <span className="status-indicator valid"></span>
                Valid
              </>
            )}
            {!hasValidKey && (
              <>
                <span className="status-indicator invalid"></span>
                Not Generated
              </>
            )}
          </div>
        </div>
        <div className="badge-detail">
          {siftedKey.length} bits
        </div>
      </motion.div>

      {isCompromised && (
        <motion.div
          className="status-badge security-alert"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="badge-icon">🚨</div>
          <div className="badge-content">
            <div className="badge-label">Security Alert</div>
            <div className="badge-status-alert">
              Eavesdropping Detected!
            </div>
          </div>
          <div className="badge-detail">
            Please regenerate key
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StatusBadges;
