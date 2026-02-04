import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./styles.css";
import SecureQuantumChat from "./SecureQuantumChat";
import StatusBadges from "./StatusBadges";
import StepTimeline from "./StepTimeline";
import { useCursorPhotonPanel } from "./useCursorPhotonPanel";
import { CursorPhotonPanel } from "./CursorPhotonPanel";
import "./TableStyles.css";

const BB84Simulator = () => {
  const [n, setN] = useState(10);
  const [eveProb, setEveProb] = useState(0.3);
  const [speed, setSpeed] = useState(150);
  const [tableData, setTableData] = useState([]);
  const [timeline, setTimeline] = useState("");
  const [photon, setPhoton] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [eveActive, setEveActive] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [siftedKey, setSiftedKey] = useState([]);
  const [qber, setQBER] = useState(0);
  const [eveKey, setEveKey] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [securityWarning, setSecurityWarning] = useState("");
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Cursor-tracking photon panel hook
  const { hoverInfo, handleMouseEnter, handleMouseMove, handleMouseLeave } =
    useCursorPhotonPanel();

  // Update QBER dynamically whenever tableData changes (frontend-only calculation)
  useEffect(() => {
    const total = tableData.length;
    const intercepted = tableData.filter(r => r["Eve Intercepting"] === "Yes").length;
    const value = total === 0 ? 0 : Number(((intercepted / total) * 100).toFixed(2));
    setQBER(value);
  }, [tableData]);

  // Tooltip logic & explanations (why bits differ / Eve details)
  const handleRowHover = (e, row, index) => {
    const aliceBit = row["Alice Bit"];
    const bobBit = row["Bob Measured Bit"];
    const eveIntercept = row["Eve Intercepting"] === "Yes";
    const basesMatch = row["Match"] === "Yes";
    const explanations = [];

    if (basesMatch) {
      if (aliceBit !== bobBit) {
        if (eveIntercept) explanations.push("Although bases matched, the bits differ — Eve may have altered the photon state.");
        else explanations.push("Bases matched but bits differ — likely due to channel noise or measurement error.");
      } else explanations.push("Bases matched and bits agree — Bob measured the same bit as Alice.");
    } else {
      explanations.push("Bases differed — Bob measured in a different basis, which yields an uncorrelated (random) result.");
    }

    if (eveIntercept) explanations.push(`Eve intercepted this photon and measured it (reported bit: ${row["Eve Bit"]}).`);
    else explanations.push("Eve did not intercept this photon.");

    if (basesMatch) explanations.push("This photon is kept during sifting because Alice and Bob used the same basis.");
    else explanations.push("This photon is discarded during sifting because bases differed.");

    setTooltipData({ index: index + 1, aliceBit, bobBit, eveIntercept, basesMatch, explanations });
    setTooltipVisible(true);
  };

  // QA Knowledge Base for chatbot
  const QA_KB = [
    {
      q: /what is bb48|bb84 protocol|explain bb84|how does this work/i,
      a: "BB84 is a quantum key distribution protocol. Alice sends qubits encoded in one of two bases (+ or ×). Bob measures in random bases. They keep only positions where their bases matched (the sifted key). If an eavesdropper (Eve) intercepts, she disturbs the system and increases the QBER (error rate), revealing her presence.",
    },
    {
      q: /what does eve(\'|)s? prob|eve prob|eve probability|what is eve/i,
      a: "Eve probability controls how often the eavesdropper intercepts and measures photons. Higher values typically raise the Quantum Bit Error Rate (QBER).",
    },
    {
      q: /qber|error rate|why is qber high/i,
      a: "QBER (Quantum Bit Error Rate) is the percentage of mismatched bits in the sifted key. In an ideal secure channel with no Eve and low noise, QBER stays low. A high QBER suggests eavesdropping or noise.",
    },
    {
      q: /sifted key|final key|why are some bits dropped|matched indices/i,
      a: "Only positions where Alice and Bob used the same basis are kept — this is key sifting. The simulator highlights those rows and forms the final sifted key from those bits.",
    },
    {
      q: /what does animation speed do|animation speed/i,
      a: "Animation speed changes how fast each photon travels across the quantum channel (purely visual).",
    },
    {
      q: /aes|encrypt|decrypt|how to encrypt/i,
      a: "After generating a sifted key, you can encrypt a message. The backend turns the key into an AES key to encrypt your text; then you can decrypt using the same key.",
    },
    {
      q: /backend|api|server|localhost 5000|error connecting/i,
      a: "This UI expects a local API at http://localhost:5000. Make sure your backend exposes /api/bb84, /api/encrypt, and /api/decrypt. If you see connection errors, start the server or check CORS.",
    },
    {
      q: /why are bases different|bases match|× vs \+|plus vs cross/i,
      a: "Alice encodes and Bob measures in random bases (+ or ×). Only matching bases yield reliable bits; different bases are discarded during sifting.",
    },
    {
      q: /reset|clear|start over/i,
      a: "To start over, just run the simulation again. It clears the table, timeline, photon, and results.",
    },
    {
      q: /tips|how to use|help/i,
      a: "1) Pick photons, Eve probability, and speed. 2) Run the simulation. 3) Watch the table fill. 4) Use the sifted key to encrypt a message; then decrypt it. If QBER > ~25–12%, assume Eve/noise.",
    },
  ];


  // Chatbot hook
  const useBot = () => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
      {
        role: "bot",
        text: "Hi! I'm your quantum helper. Ask me about BB84, QBER, Eve, or how to encrypt/decrypt here.",
      },
    ]);

    const match = (text) => {
      for (const { q, a } of QA_KB) {
        if (q.test(text)) return a;
      }
      return "I'm not sure yet — try asking about 'BB84', 'Eve probability', 'QBER', or 'encryption'.";
    };

    const send = (text) => {
      if (!text.trim()) return;
      const userMsg = { role: "user", text };
      const botMsg = { role: "bot", text: match(text) };
      setMessages((m) => [...m, userMsg, botMsg]);
      setInput("");
    };

    return { open, setOpen, input, setInput, messages, send };
  };



  // Chatbot component
  const ChatHelpBot = () => {
    const { open, setOpen, input, setInput, messages, send } = useBot();
    const endRef = useRef(null);

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

    const quickPrompts = useMemo(
      () => [
        "What is BB84?",
        "What does Eve probability do?",
        "Why is QBER high?",
        "How do I encrypt a message?",
      ],
      []
    );

    return (
      <>
        <button
          className="chatbot-toggle"
          aria-label="Open help chatbot"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✖" : "💬 Help"}
        </button>

        <AnimatePresence>
          {open && (
            <motion.aside
              key="chatbot"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2 }}
              className="chatbot-panel"
            >
              <div className="chatbot-header">
                <span>Quantum Help</span>
                <button className="chatbot-close" onClick={() => setOpen(false)}>
                  ×
                </button>
              </div>

              <div className="chatbot-body">
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="chatbot-quick">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="chip"
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <form
                className="chatbot-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question…"
                  aria-label="Type your question"
                />
                <button type="submit">Send</button>
              </form>
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setTableData([]);
    setHighlightedRow(null);
    setSiftedKey([]);
    setQBER(0);
    setEveKey([]);
    setSecurityWarning("");
    setTimeline("");
    setEncryptedData(null);
    setDecryptedMessage("");
    setMessage("");
    try {
      const response = await fetch('http://localhost:5000/api/bb84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n_bits: n, eve_prob: eveProb })
      });
      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Error: ${data.error}`);
        setIsRunning(false);
        return;
      }

      // Animate and add rows to table
      for (let i = 0; i < data.table_data.length; i++) {
        const eveHere = data.table_data[i]["Eve Intercepting"] === "Yes";
        setEveActive(eveHere);
        await animatePhoton(
          data.table_data[i]["Alice Bit"], 
          data.table_data[i]["Alice Basis"].includes("+") ? 0 : 1,
          eveHere
        );
        setTableData(prev => [...prev, data.table_data[i]]);
      }

      // Set final results
      setSiftedKey(data.bob_key);
      setEveKey(data.eve_key);
      
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error connecting to quantum backend");
    } finally {
      setIsRunning(false);
    }
  };

  const animatePhoton = (bit, basis, eveHere) => {
    return new Promise((resolve) => {
      const symbol = bit === 0 ? "→" : "↗";
      const color = bit === 0 ? "#4A90E2" : "#FF6B6B";
      setPhoton({ symbol, color, basis, bit });
      setAnimationKey((prev) => prev + 1);

      setTimeout(() => setEveActive(false), (speed * 30) / 2);
      setTimeout(resolve, speed * 30);
    });
  };

  // Modify encryptMessage function to check QBER
  const encryptMessage = async () => {
    if (parseFloat(qber) > 20) {
      setSecurityWarning("❌ Encryption blocked: QBER is too high (>20%). Potential eavesdropping detected.");
      return;
    }
    
    if (!message || siftedKey.length === 0) {
      setTimeline("Please generate a key and enter a message first");
      return;
    }

    setSecurityWarning("");
    setTimeline("Encrypting message with quantum key...");
    
    try {
      const response = await fetch('http://localhost:5000/api/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          key: siftedKey
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Encryption error: ${data.error}`);
        return;
      }

      setEncryptedData(data);
      setTimeline("✅ Message encrypted successfully");
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error encrypting message");
    }
  };

  // Modify decryptMessage function to check QBER
  const decryptMessage = async () => {
    if (parseFloat(qber) > 20) {
      setSecurityWarning("❌ Decryption blocked: QBER is too high (>20%). Potential eavesdropping detected.");
      return;
    }
    
    if (!encryptedData || siftedKey.length === 0) {
      setTimeline("No encrypted data or key available");
      return;
    }

    setSecurityWarning("");
    setTimeline("Decrypting message with quantum key...");
    
    try {
      const response = await fetch('http://localhost:5000/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_data: encryptedData,
          key: siftedKey
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Decryption error: ${data.error}`);
        return;
      }

      setDecryptedMessage(data.decrypted);
      setTimeline("✅ Message decrypted successfully");
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error decrypting message");
    }
  };

  const BasisIndicator = ({ basis }) => (
    <span style={{ 
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "6px",
      background: basis === 0 ? "rgba(74,144,226,0.15)" : "rgba(255,193,7,0.15)",
      border: `2px solid ${basis === 0 ? "#4A90E2" : "#FFC107"}`,
      color: basis === 0 ? "#4A90E2" : "#FFC107",
      fontWeight: "bold",
      fontSize: "1.1em",
      minWidth: "30px",
      textAlign: "center"
    }}>
      {basis === 0 ? "+" : "×"}
    </span>
  );

  const BitIndicator = ({ bit }) => (
    <span className={`bit-indicator ${bit === 0 ? "zero" : "one"}`}>{bit}</span>
  );

  // Small presentational info tooltip (pure JSX + CSS)
  // pass `corner` to place the icon absolutely in the top-right of its parent
  const Info = ({ text, corner = false }) => (
    <span className={"info-icon" + (corner ? " info-icon--corner" : "")} tabIndex="0" aria-label="Info">
      ℹ️
      <span className="tooltip-text">{text}</span>
    </span>
  );

  return (
    <div className="quantum-simulator">
      <ChatHelpBot />
      
      <div className="header">
        <h1>Quantum BB84 Simulator</h1>
        <p className="subtitle">Visualizing Quantum Key Distribution with the BB84 Protocol</p>
      </div>

      {securityWarning && (
        <div className="security-warning">
          {securityWarning}
        </div>
      )}

      <div className="controls-container">
        <div className="controls">
          {[
            { label: "Number of photons", value: n, min: 10, max: 50, step: 1, setter: setN },
            { label: "Eve probability", value: eveProb, min: 0, max: 1, step: 0.1, setter: setEveProb, format: (v) => `${(v * 100).toFixed(0)}%`, tooltip: "Probability of an attacker intercepting qubits during transmission." },
            { label: "Animation speed", value: speed, min: 10, max: 300, step: 10, setter: setSpeed, format: (v) => `${v}ms` },
          ].map((ctrl) => (
            <div key={ctrl.label} className="control-item">
              <label>{ctrl.label} {ctrl.tooltip && <Info text={ctrl.tooltip} />}: {ctrl.format ? ctrl.format(ctrl.value) : ctrl.value}</label>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={ctrl.value}
                onChange={(e) => ctrl.setter(Number(e.target.value))}
                disabled={isRunning}
              />
            </div>
          ))}
        </div>

        <div className="simulate-button-container">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="simulate-button"
          >
            {isRunning ? "⏳ Running Quantum Simulation..." : "▶️ Run Quantum Simulation"}
          </button>
        </div>
      </div>

      <StepTimeline 
        isRunning={isRunning}
        tableData={tableData}
        siftedKey={siftedKey}
        qber={qber}
        encryptedData={encryptedData}
        decryptedMessage={decryptedMessage}
      />

      <div className="timeline">{timeline}</div>

      <div className="results-table">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {["Alice Basis","Alice Bit", "Bob Basis", "Bob Measured Bit", "Eve Bit", "Eve Intercepting", "Match"].map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => {
                const eveIntercept = row["Eve Intercepting"] === "Yes";
                const basesMatch = row["Match"] === "Yes";
                
                let rowClass = '';
                if (highlightedRow === idx) rowClass = 'highlighted selected';
                else if (eveIntercept && basesMatch) rowClass = 'eve-dark';
                else if (eveIntercept && !basesMatch) rowClass = 'eve-light';
                else if (!eveIntercept && basesMatch) rowClass = 'correct';
                else rowClass = 'bases-differ';

                // Map row data to expected format
                const rowDataForPanel = {
                  aliceBit: parseInt(row["Alice Bit"]),
                  aliceBasis: row["Alice Basis"],
                  bobBasis: row["Bob Basis"],
                  bobMeasuredBit: parseInt(row["Bob Measured Bit"]),
                  eveIntercepting: row["Eve Intercepting"] === "Yes",
                  basesMatch: row["Match"] === "Yes",
                };

                return (
                  <tr
                    key={idx}
                    className={rowClass}
                    onMouseEnter={(e) => handleMouseEnter(e, idx, rowDataForPanel)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <td><BasisIndicator basis={row["Alice Basis"].includes("+") ? 0 : 1} /></td>
                    <td><BitIndicator bit={parseInt(row["Alice Bit"])} /></td>
                    <td><BasisIndicator basis={row["Bob Basis"].includes("+") ? 0 : 1} /></td>
                    <td><BitIndicator bit={parseInt(row["Bob Measured Bit"])} /></td>
                    <td>{row["Eve Bit"] === "-" ? "-" : <BitIndicator bit={parseInt(row["Eve Bit"])} />}</td>
                    <td>{row["Eve Intercepting"]}</td>
                    <td>{row["Match"]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CursorPhotonPanel hoverInfo={hoverInfo} />

      <div className="results">
        <h2>Quantum Results</h2>
        
        <div className="result-cards">
          <div className="result-card">
            <h3>Final Sifted Key</h3>
            <div className="key-display">
              {siftedKey.length > 0 ? siftedKey.map((bit, idx) => (
                <span key={idx} className={`bit ${bit === 0 ? "zero" : "one"}`}>
                  {bit}
                </span>
              )) : "-"}
            </div>
            <p>{siftedKey.length} bits</p>
          </div>
          
          <div className="result-card">
            <h3>Quantum Bit Error Rate <Info text={"Quantum Bit Error Rate indicates disturbance in the quantum channel. High QBER suggests possible eavesdropping."} corner={true} /></h3>
            <div className="qber-value">{qber}%</div>
            <p>{qber > 20 ? "High error rate - Eve might be present!" : "Low error rate - channel is secure"}</p>
          </div>
          
          <div className="result-card">
            <h3>Eve's Intercepted Key</h3>
            <div className="key-display">
              {eveKey.length > 0 ? eveKey.map((bit, idx) => (
                <span key={idx} className={`bit eve-bit ${bit === 0 ? "zero" : "one"}`}>
                  {bit}
                </span>
              )) : "-"}
            </div>
            <p>{eveKey.length} bits intercepted</p>
          </div>
        </div>
      </div>

      <div className="encryption-section">
        <h2>AES Encryption <Info text={"Quantum-generated symmetric key used for secure AES encryption."} corner={true} /> {parseFloat(qber) > 20 && "(Disabled - High QBER)"}</h2>
        
        <div className="encryption-controls">
          <div className="input-group">
            <label>Message to encrypt:</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter secret message"
              disabled={parseFloat(qber) > 20}
            />
          </div>
          
          <button 
            onClick={encryptMessage} 
            disabled={siftedKey.length === 0 || parseFloat(qber) > 20}
          >
            {parseFloat(qber) > 20 ? "Encryption Disabled" : "Encrypt with Quantum Key"}
          </button>
          
          {encryptedData && (
            <div className="encrypted-data">
              <h4>Encrypted Message:</h4>
              <div className="ciphertext">{encryptedData.ciphertext}</div>
              
              <button 
                onClick={decryptMessage} 
                style={{ marginTop: '15px' }}
                disabled={parseFloat(qber) > 20}
              >
                {parseFloat(qber) >20 ? "Decryption Disabled" : "Decrypt with Quantum Key"}
              </button>
            </div>
          )}
          
          {decryptedMessage && (
            <div className="decrypted-data">
              <h4>Decrypted Message:</h4>
              <div className="plaintext">{decryptedMessage}</div>
            </div>
          )}
        </div>
      </div>

      <StatusBadges 
        qber={qber}
        siftedKey={siftedKey}
      />

      <SecureQuantumChat 
        siftedKey={siftedKey}
        encryptedData={encryptedData}
        decryptedMessage={decryptedMessage}
        qber={qber}
      />

      <div className="legend">
        <h3>Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="color-swatch correct"></div>
            <span>Matching bases (no Eve)</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch eve-present"></div>
            <span>Eve intercepted</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch error"></div>
            <span>Measurement error</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch bases-differ"></div>
            <span>Different bases</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch highlighted"></div>
            <span>Selected for key <Info text={"Bits retained after sifting and error correction to form the final key."} /></span>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Quantum BB84 Protocol Simulator | Secure Quantum Communication</p>
      </div>
    </div>
  );
};

export default BB84Simulator;
