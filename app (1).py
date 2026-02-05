# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import numpy as np
import random
from Crypto.Cipher import AES
import base64
import os
import secrets
from functools import wraps
import hashlib 

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend
# IBM Quantum Service
try:
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
    # Note: If you haven't saved your account locally, you can do so here:
    # QiskitRuntimeService.save_account(channel="ibm_quantum", token="YOUR_TOKEN", overwrite=True)
    QiskitRuntimeService.save_account(
        token="a_frszdc-gutL_Y9xKzKM9aVW2uuSUAx3FCvaVA9kZsK", # Use the 44-character API_KEY you created and saved from the IBM Quantum Platform Home dashboard
        instance="crn:v1:bluemix:public:quantum-computing:us-east:a/0dabbbeda08947b288425684a966111a:d7d35d82-ad79-4cc1-9169-215eb581e1ef::", # Optional
        channel="ibm_quantum_platform",
        overwrite=True,
    )
    
    # Check if we can initialize the service
    service = QiskitRuntimeService()
    IBM_AVAILABLE = True
    print("✅ IBM Quantum Service detected.")
except Exception as e:
    print(f"⚠️ IBM Quantum Service not available: {e}")
    IBM_AVAILABLE = False

def get_backend(use_real=True,min_qubits=1):
    """
    Returns IBM real backend if available, else Aer simulator
    """
    if use_real and IBM_AVAILABLE:
        try:
            backend = service.least_busy(
                operational=True, 
                simulator=False,
                min_num_qubits=min_qubits
            )
            print(f"✅ Using REAL IBM backend: {backend.name} ({backend.num_qubits} qubits)")
            return backend
        except Exception as e:
            print("⚠️ IBM backend error:", e)

    print("⚠️ Using AER Simulator")
    return Aer.get_backend("qasm_simulator")

def generate_secure_bits(n):
    """Generate cryptographically secure random bits."""
    return [secrets.randbits(1) for _ in range(n)]

def measure_message(circuits, bases):
    measured_circuits = []
    for qc, basis in zip(circuits, bases):
        measured_qc = qc.copy()
        if basis == 1:  # X basis → apply H before measurement
            measured_qc.h(0)
        measured_qc.measure(0, 0)
        measured_circuits.append(measured_qc)
    return measured_circuits

def calculate_qber(alice_key, bob_key):
    """Calculate Quantum Bit Error Rate (QBER)."""
    if not alice_key or not bob_key:  # avoid division by zero
        return 0.0
    errors = sum(a != b for a, b in zip(alice_key, bob_key))
    qber = errors / len(alice_key)
    return qber

def eavesdrop_simulation(alice_bits, alice_bases, eve_bases, eve_prob):
    """
    Simulate Eve's interception purely in software/simulator.
    Returns:
        eve_results: list of bits Eve measured (or None)
        new_alice_bits: The bits Bob effectively receives (modified by Eve)
        new_alice_bases: The bases Bob effectively sees (modified by Eve)
    """
    eve_results = []
    # These become the "effective" state sent to Bob
    resend_bits = list(alice_bits)
    resend_bases = list(alice_bases)

    for i in range(len(alice_bits)):
        if random.random() < eve_prob:
            # Eve Intercepts!
            # 1. Create a temp circuit for this 1 bit to simulate measurement
            qc = QuantumCircuit(1, 1)
            
            # Alice prepares
            if alice_bases[i] == 1: # X basis
                if alice_bits[i] == 0: qc.h(0)
                else: qc.x(0); qc.h(0)
            else: # Z basis
                if alice_bits[i] == 1: qc.x(0)
            
            # Eve measures
            if eve_bases[i] == 1: # Measure in X
                qc.h(0)
            qc.measure(0, 0)

            # Run strictly on simulator for speed
            sim = Aer.get_backend("qasm_simulator")
            job = sim.run(transpile(qc, sim), shots=1)
            bit = int(list(job.result().get_counts().keys())[0])
            
            eve_results.append(bit)
            
            # Eve Resends (Modifies the bit/basis Bob will see)
            # Conceptually, Eve replaces Alice's photon with her own
            resend_bits[i] = bit
            resend_bases[i] = eve_bases[i]
        else:
            eve_results.append(None)
    
    return eve_results, resend_bits, resend_bases

def bb84_protocol(n_bits=10, with_eve=False, eve_prob=0.0, use_aer=True):
    
    # 1. Generate Alice's random bits and bases
    alice_bits = generate_secure_bits(n_bits)
    alice_bases = generate_secure_bits(n_bits)
    bob_bases = generate_secure_bits(n_bits)
    
    # 2. Handle Eve (Simulation/Classical Pre-processing)
    # We do this classically/locally so we don't need interactive dynamic circuits on hardware
    eve_results = [None] * n_bits
    effective_bits = alice_bits
    effective_bases = alice_bases

    if with_eve:
        eve_bases = generate_secure_bits(n_bits)
        eve_results, effective_bits, effective_bases = eavesdrop_simulation(
            alice_bits, alice_bases, eve_bases, eve_prob
        )
    backend = get_backend(use_real=not use_aer, min_qubits=n_bits)
    bob_results = []
    # 3. BUILD ONE PARALLEL CIRCUIT
    # Instead of list of N circuits, we make 1 circuit with N qubits
    #qc = QuantumCircuit(n_bits, n_bits)
    if use_aer:
        # --- PATH A: LIST OF CIRCUITS FOR SIMULATOR ---
        circuits = []
        for i in range(n_bits):
            qc = QuantumCircuit(1, 1)
            # Prepare
            if effective_bases[i] == 1: # X basis
                if effective_bits[i] == 0: qc.h(0)
                else: qc.x(0); qc.h(0)
            else: # Z basis
                if effective_bits[i] == 1: qc.x(0)
            
            # Bob measure
            if bob_bases[i] == 1: qc.h(0)
            qc.measure(0, 0)
            circuits.append(qc)
        # Execute list on Aer
        job = backend.run(transpile(circuits, backend), shots=1)
        result = job.result()
        for i in range(n_bits):
            counts = result.get_counts(i)
            bob_results.append(int(list(counts.keys())[0]))
    else:
        # --- PATH B: PARALLEL CIRCUIT FOR REAL IBM HARDWARE ---
        qc = QuantumCircuit(n_bits, n_bits)
        for i in range(n_bits):
            if effective_bases[i] == 1:
                if effective_bits[i] == 0: qc.h(i)
                else: qc.x(i); qc.h(i)
            else:
                if effective_bits[i] == 1: qc.x(i)
            
            if bob_bases[i] == 1: qc.h(i)
            qc.measure(i, i)

        if IBM_AVAILABLE:
            isa_circuit = transpile(qc, backend=backend, optimization_level=1)
            sampler = Sampler(mode=backend)
            job = sampler.run([isa_circuit])
            print(f"🚀 IBM Job ID: {job.job_id()}")
            
            res = job.result()[0]
            # Dynamic key detection for IBM results
            data_key = 'c' if hasattr(res.data, 'c') else next(iter(res.data))
            counts = getattr(res.data, data_key).get_counts()
            
            measured_string = max(counts, key=counts.get)[::-1]
            measured_string = measured_string.ljust(n_bits, '0')
            bob_results = [int(bit) for bit in measured_string[:n_bits]]

    # 5. Sifting and QBER
    alice_key = []
    bob_key = []
    matched_indices = []

    for i in range(n_bits):
        if alice_bases[i] == bob_bases[i]:
            alice_key.append(alice_bits[i])
            bob_key.append(bob_results[i])
            matched_indices.append(i)

    qber = calculate_qber(alice_key, bob_key)

    final_key = []
    for a, b in zip(alice_key, bob_key):
        if a == b:
            final_key.append(a)
    if not final_key and len(alice_key) > 0:
        # Fallback for demo: just take the first few bits of Alice's key so app doesn't crash
        final_key = alice_key[:2]
    # 6. Format Table Data
    table_data = []
    for i in range(n_bits):
        eve_intercepted = with_eve and eve_results[i] is not None
        table_data.append({
            "Alice Bit": int(alice_bits[i]),
            "Alice Basis": "+ (0°)" if alice_bases[i] == 0 else "× (45°)",
            "Bob Basis": "+ (0°)" if bob_bases[i] == 0 else "× (45°)",
            "Eve Intercepting": "Yes" if eve_intercepted else "No",
            "Eve Bit": int(eve_results[i]) if eve_intercepted else "-",
            "Bob Measured Bit": int(bob_results[i]),
            "Match": "Yes" if alice_bases[i] == bob_bases[i] else "No"
        })

    eve_key_extracted = []
    if with_eve:
        for i in matched_indices:
            if eve_results[i] is not None:
                eve_key_extracted.append(int(eve_results[i]))

    return {
        "table_data": table_data,
        "alice_key": [int(b) for b in alice_key],
        "bob_key": [int(b) for b in bob_key],
        "qber": float(qber),
        "eve_key": eve_key_extracted,
        "matched_indices": matched_indices
    }
# ---------------------- NEW HELPER ----------------------
def derive_final_key(bits, length=16):
    """
    Apply privacy amplification using SHA-256.
    Returns a strong key of `length` bytes (default 32 = AES-256).
    """
    if not bits:
        raise ValueError("Empty key bits, cannot derive final key")
    # Convert list of bits → bytes
    bitstring = ''.join(map(str, bits))  
    key_bytes = hashlib.sha256(bitstring.encode()).digest()
    return key_bytes[:length]   # AES-128 if length=16, AES-256 if length=32
# --------------------------------------------------------

def aes_encrypt(message, key_bits):
    """Encrypt a message using AES with privacy-amplified quantum key"""
    key_bytes = derive_final_key(key_bits, 16)   # ✅ use SHA-256 derived key
    cipher = AES.new(key_bytes, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return {
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'nonce': base64.b64encode(cipher.nonce).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8')
    }

def aes_decrypt(encrypted_data, key_bits):
    """Decrypt a message using AES with privacy-amplified quantum key"""
    key_bytes = derive_final_key(key_bits, 16)   # ✅ use SHA-256 derived key
    ciphertext = base64.b64decode(encrypted_data['ciphertext'])
    nonce = base64.b64decode(encrypted_data['nonce'])
    tag = base64.b64decode(encrypted_data['tag'])
    
    cipher = AES.new(key_bytes, AES.MODE_EAX, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return plaintext.decode('utf-8')

@app.route("/")
def home():
    return {"message": "Backend is live!"}

@app.route('/api/bb84', methods=['POST'])
def run_bb84():
    data = request.json
    n_bits = data.get('n_bits', 10)
    eve_prob = data.get('eve_prob', 0.3)
    use_real = data.get("use_real", False)
    with_eve = eve_prob > 0
    
    try:
        results = bb84_protocol(
            n_bits=n_bits,
            with_eve=with_eve,
            eve_prob=eve_prob,
            use_aer=not use_real
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/encrypt', methods=['POST'])
def encrypt_message():
    data = request.json
    message = data.get('message', '')
    key = data.get('key', [])
    
    try:
        encrypted = aes_encrypt(message, key)
        return jsonify(encrypted)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/decrypt', methods=['POST'])
def decrypt_message():
    data = request.json
    encrypted_data = data.get('encrypted_data', {})
    key = data.get('key', [])
    
    try:
        decrypted = aes_decrypt(encrypted_data, key)
        return jsonify({'decrypted': decrypted})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
def generate_aer_random_bits(n_bits, retries=2):
    """
    Generate n_bits random bits using Qiskit Aer qasm_simulator.
    """
    if n_bits <= 0: return []
    
    # Force Aer simulator for RNG to avoid wasting QPU time/money
    backend = Aer.get_backend("qasm_simulator")
    
    qc = QuantumCircuit(n_bits, n_bits)
    for q in range(n_bits):
        qc.h(q)
    qc.measure(range(n_bits), range(n_bits))
    
    attempt = 0
    while attempt <= retries:
        try:
            # Simple run on Aer
            transpiled = transpile(qc, backend)
            job = backend.run(transpiled, shots=1)
            result = job.result()
            counts = result.get_counts()
            bitstring = next(iter(counts.keys()))
            # Reverse bitstring (Qiskit endianness)
            bitstring = bitstring[::-1]
            bits = [int(b) for b in bitstring]
            
            # Pad or truncate
            if len(bits) < n_bits:
                bits.extend([0] * (n_bits - len(bits)))
            return bits[:n_bits]
        except Exception as e:
            attempt += 1
            if attempt > retries:
                print(f"RNG Fallback: {e}")
                return [secrets.randbits(1) for _ in range(n_bits)]
            
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render will supply PORT
    app.run(host="0.0.0.0", port=port, debug=False,use_reloader=False)
