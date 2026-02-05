import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SecureQuantumChat = ({ siftedKey, encryptedData, decryptedMessage, qber }) => {
  const [aliceMessage, setAliceMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastMessageId, setLastMessageId] = useState(null);

  // Reset chat whenever siftedKey is cleared (new simulation starts)
  useEffect(() => {
    if (siftedKey.length === 0) {
      setChatMessages([]);
      setAliceMessage("");
      setLastMessageId(null);
    }
  }, [siftedKey]);

  // Auto-update chat when encrypted data arrives
  useEffect(() => {
    if (encryptedData && lastMessageId && chatMessages.length > 0) {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === lastMessageId
            ? { 
                ...msg, 
                ciphertext: encryptedData.ciphertext || msg.ciphertext,
                decrypted: decryptedMessage || msg.decrypted,
                showStages: true 
              }
            : msg
        )
      );
    }
  }, [encryptedData, decryptedMessage, lastMessageId]);

  const handleSendMessage = async () => {
    if (!aliceMessage.trim() || siftedKey.length === 0) {
      return;
    }

    setIsSimulating(true);

    // Create message with placeholder - will be updated when encryption completes
    const messageId = Date.now();
    const newMessage = {
      id: messageId,
      plaintext: aliceMessage,
      ciphertext: "[Encrypting...]",
      decrypted: "[Decrypting...]",
      timestamp: new Date().toLocaleTimeString(),
      showStages: false,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setLastMessageId(messageId);
    setAliceMessage("");
    setIsSimulating(false);
  };

  const isKeyValid = siftedKey.length > 0 && parseFloat(qber) <= 20;

  return (
    <div className="secure-quantum-chat">
      <h2>🔐 Secure Quantum Chat</h2>
      <p className="chat-subtitle">
        End-to-end encryption using the generated quantum key
      </p>

      <div className="chat-container">
        {/* Alice - Sender Panel */}
        <div className="chat-panel alice-panel">
          <div className="panel-header alice-header">
            <div className="party-name">
              <span className="party-avatar">👩</span>
              <span className="party-label">Alice (Sender)</span>
            </div>
          </div>

          <div className="panel-content">
            {chatMessages.length === 0 ? (
              <div className="empty-state">
                <p>No messages yet.</p>
                <p className="hint">Send a message to start secure communication</p>
              </div>
            ) : (
              <div className="messages-list">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="message-bubble alice-message">
                    <div className="message-text">{msg.plaintext}</div>
                    <div className="message-time">{msg.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-input">
            <input
              type="text"
              value={aliceMessage}
              onChange={(e) => setAliceMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && isKeyValid && !isSimulating) {
                  handleSendMessage();
                }
              }}
              placeholder="Type a secret message..."
              disabled={!isKeyValid || isSimulating}
              className={!isKeyValid ? "disabled-input" : ""}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isKeyValid || isSimulating || !aliceMessage.trim()}
              className="send-button"
              title={
                !isKeyValid
                  ? "QBER too high - key is not secure"
                  : "Send secure message"
              }
            >
              {isSimulating ? "⏳" : "📤"} Send
            </button>
          </div>

          {!isKeyValid && (
            <div className="security-note">
              ⚠️ {parseFloat(qber) > 20 ? "QBER too high" : "No quantum key"}
            </div>
          )}
        </div>

        {/* Encryption Pipeline - Center */}
        <div className="encryption-pipeline">
          <div className="pipeline-step">
            <div className="step-label">Plaintext</div>
            <div className="step-icon">📄</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">Quantum Key</div>
            <div className="step-icon">🔑</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">AES Encryption</div>
            <div className="step-icon">⚙️</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">Ciphertext</div>
            <div className="step-icon">🔒</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">Quantum Channel</div>
            <div className="step-icon">📡</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">AES Decryption</div>
            <div className="step-icon">🔓</div>
          </div>

          <motion.div
            className="pipeline-arrow"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
          >
            ↓
          </motion.div>

          <div className="pipeline-step">
            <div className="step-label">Plaintext</div>
            <div className="step-icon">📖</div>
          </div>
        </div>

        {/* Bob - Receiver Panel */}
        <div className="chat-panel bob-panel">
          <div className="panel-header bob-header">
            <div className="party-name">
              <span className="party-avatar">👨</span>
              <span className="party-label">Bob (Receiver)</span>
            </div>
          </div>

          <div className="panel-content">
            {chatMessages.length === 0 ? (
              <div className="empty-state">
                <p>Waiting for messages...</p>
                <p className="hint">Decrypted messages will appear here</p>
              </div>
            ) : (
              <div className="messages-list">
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="message-bubble bob-message"
                  >
                    {msg.showStages && (
                      <div className="message-stages">
                        <div className="stage">
                          <div className="stage-label">Received (Encrypted):</div>
                          <div className="stage-content ciphertext-stage">
                            {msg.ciphertext}
                          </div>
                        </div>
                        <div className="stage-arrow">↓</div>
                        <div className="stage">
                          <div className="stage-label">Decrypted with Key:</div>
                          <div className="stage-content plaintext-stage">
                            {msg.decrypted}
                          </div>
                        </div>
                      </div>
                    )}
                    {!msg.showStages && (
                      <div className="processing">⏳ Decrypting...</div>
                    )}
                    <div className="message-time">{msg.timestamp}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-info">
            <div className="key-status">
              <span className="status-dot"></span>
              {isKeyValid ? "✓ Ready to Receive" : "✗ Not Ready"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureQuantumChat;
