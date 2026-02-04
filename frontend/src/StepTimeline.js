import React from "react";
import { motion } from "framer-motion";

const StepTimeline = ({ isRunning, tableData, siftedKey, qber, encryptedData, decryptedMessage }) => {
  // Determine which steps have been completed based on component state
  const steps = [
    {
      id: 1,
      label: "Qubits",
      icon: "💡",
      description: "Quantum bits sent",
      completed: tableData.length > 0,
    },
    {
      id: 2,
      label: "Basis Matching",
      icon: "🎯",
      description: "Bases compared",
      completed: tableData.length > 5,
    },
    {
      id: 3,
      label: "Key Sifting",
      icon: "🔍",
      description: "Extract matching bits",
      completed: siftedKey.length > 0,
    },
    {
      id: 4,
      label: "Error Detection",
      icon: "⚠️",
      description: "Check QBER",
      completed: qber !== null && qber !== undefined && qber !== 0,
    },
    {
      id: 5,
      label: "AES Encryption",
      icon: "🔐",
      description: "Encrypt message",
      completed: encryptedData !== null,
    },
    {
      id: 6,
      label: "Secure Chat",
      icon: "💬",
      description: "Send encrypted",
      completed: decryptedMessage !== "",
    },
  ];

  return (
    <div className="step-timeline-container">
      <h3 className="timeline-title">Protocol Progress</h3>
      
      <div className="steps-track">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.div
              className={`step-item ${step.completed ? "completed" : ""} ${
                isRunning ? "running" : ""
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="step-circle">
                <motion.div
                  className="step-icon"
                  animate={step.completed ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {step.icon}
                </motion.div>
                {step.completed && (
                  <motion.div
                    className="step-checkmark"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    ✓
                  </motion.div>
                )}
              </div>
              <div className="step-content">
                <div className="step-label">{step.label}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </motion.div>

            {index < steps.length - 1 && (
              <div
                className={`step-connector ${
                  steps[index].completed ? "active" : ""
                }`}
              >
                {steps[index].completed && (
                  <motion.div
                    className="connector-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {isRunning && (
        <motion.div
          className="timeline-status"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ⏳ Simulation in progress...
        </motion.div>
      )}

      {!isRunning && siftedKey.length > 0 && (
        <motion.div
          className="timeline-complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ✅ Quantum key generation complete
        </motion.div>
      )}
    </div>
  );
};

export default StepTimeline;
