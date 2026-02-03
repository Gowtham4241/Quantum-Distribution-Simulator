# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import numpy as np
import random
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import base64
import os
from functools import wraps
import hashlib 

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend
# IBM Quantum Service
try:
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
    # Note: If you haven't saved your account locally, you can do so here:
    # QiskitRuntimeService.save_account(channel="ibm_quantum", token="YOUR_TOKEN", overwrite=True)
    
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


def encode_message(bits, bases):
    circuits = []
    for bit, basis in zip(bits, bases):
        qc = QuantumCircuit(1, 1)
        if basis == 0:  # Z basis
            if bit == 1:
                qc.x(0)
        else:  # X basis
            if bit == 0:
                qc.h(0)
            else:
                qc.x(0)
                qc.h(0)
        circuits.append(qc)
    return circuits

def measure_message(circuits, bases):
    measured_circuits = []
    for qc, basis in zip(circuits, bases):
        measured_qc = qc.copy()
        if basis == 1:  # X basis → apply H before measurement
            measured_qc.h(0)
        measured_qc.measure(0, 0)
        measured_circuits.append(measured_qc)
    return measured_circuits

def remove_garbage(a_bases, b_bases, bits):
    return [bit for i, bit in enumerate(bits) if a_bases[i] == b_bases[i]]

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

def bb84_protocol(n_bits=10, seed=None, with_eve=False, eve_prob=0.0, use_aer=True):
    
    # 1. Generate Alice's random bits and bases
    if seed is not None:
        np.random.seed(seed)
        
    alice_bits = np.random.randint(2, size=n_bits)
    alice_bases = np.random.randint(2, size=n_bits)
    bob_bases = np.random.randint(2, size=n_bits)
    
    # 2. Handle Eve (Simulation/Classical Pre-processing)
    # We do this classically/locally so we don't need interactive dynamic circuits on hardware
    eve_results = [None] * n_bits
    effective_bits = alice_bits
    effective_bases = alice_bases

    if with_eve:
        eve_bases = np.random.randint(2, size=n_bits)
        eve_results, effective_bits, effective_bases = eavesdrop_simulation(
            alice_bits, alice_bases, eve_bases, eve_prob
        )

    # 3. BUILD ONE PARALLEL CIRCUIT
    # Instead of list of N circuits, we make 1 circuit with N qubits
    qc = QuantumCircuit(n_bits, n_bits)

    for i in range(n_bits):
        # A. Alice (or Eve's resent state) prepares qubit i
        bit = effective_bits[i]
        basis = effective_bases[i]

        if basis == 0:  # Z basis
            if bit == 1:
                qc.x(i)
        else:  # X basis
            if bit == 0:
                qc.h(i)
            else:
                qc.x(i)
                qc.h(i)

        # B. Bob measures qubit i
        b_basis = bob_bases[i]
        if b_basis == 1: # X basis measurement
            qc.h(i)
        
        qc.measure(i, i)

    # 4. EXECUTION
    backend = get_backend(use_real=not use_aer, min_qubits=n_bits)
    bob_results = []

    if IBM_AVAILABLE and not use_aer:
        print(f"🚀 Running PARALLEL Job on: {backend.name}")
        
        # A. Transpile ONE circuit
        isa_circuit = transpile(qc, backend=backend, optimization_level=1)
        
        # B. Run ONE job
        sampler = Sampler(mode=backend)
        job = sampler.run([isa_circuit]) # Send list containing 1 circuit
        print(f"Job ID: {job.job_id()}")
        
        # C. Get Result
        try:
            result = job.result()
            # Get counts from the first (and only) pub result
            pub_result = result[0]
            # Handle different register names (c vs meas)
            if hasattr(pub_result.data, 'c'):
                counts = pub_result.data.c.get_counts()
            else:
                first_key = next(iter(pub_result.data))
                counts = getattr(pub_result.data, first_key).get_counts()
            
            # Counts key is a bitstring "10010...", we need to parse it
            # Qiskit bitstrings are little-endian (qubit 0 is rightmost)
            measured_string = max(counts, key=counts.get) # Get most probable bitstring
            
            # Reverse to match array index (index 0 -> left)
            measured_string = measured_string[::-1]
            
            # If backend returned fewer bits (rare), pad it
            if len(measured_string) < n_bits:
                measured_string = measured_string.ljust(n_bits, '0')

            bob_results = [int(bit) for bit in measured_string[:n_bits]]

        except Exception as e:
            print(f"Error parsing results: {e}")
            # Fallback to zeros if parse fails
            bob_results = [0] * n_bits
    else:
        # Simulator run
        job = backend.run(transpile(qc, backend), shots=1)
        result = job.result()
        counts = result.get_counts()
        measured_string = list(counts.keys())[0] # "010101"
        measured_string = measured_string[::-1] # Reverse for index matching
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
def check_security(qber_threshold=0.1):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.json
            key = data.get('key', [])
            
            # If no key is provided or key is empty, allow the operation
            if not key:
                return f(*args, **kwargs)
                
            # Calculate QBER from the key (this is a simplified example)
            # In a real implementation, you'd want to track QBER from the BB84 protocol
            if len(key) > 10:  # Only check if we have enough bits
                # Simple heuristic: if more than threshold of bits are 1, consider it suspicious
                ones_ratio = sum(key) / len(key)
                if abs(ones_ratio - 0.5) > qber_threshold:  # Should be roughly 50/50
                    return jsonify({'error': 'High QBER detected. Key may be compromised.'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ---------------------- NEW HELPER ----------------------
def derive_final_key(bits, length=32):
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
    key_bytes = derive_final_key(key_bits, 32)   # ✅ use SHA-256 derived key
    cipher = AES.new(key_bytes, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return {
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'nonce': base64.b64encode(cipher.nonce).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8')
    }

def aes_decrypt(encrypted_data, key_bits):
    """Decrypt a message using AES with privacy-amplified quantum key"""
    key_bytes = derive_final_key(key_bits, 32)   # ✅ use SHA-256 derived key
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
    seed = data.get('seed', None)
    use_real = data.get("use_real", False)
    with_eve = eve_prob > 0
    
    try:
        results = bb84_protocol(
            n_bits=n_bits,
            seed=seed,
            with_eve=with_eve,
            eve_prob=eve_prob,
            use_aer=not use_real
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/encrypt', methods=['POST'])
@check_security()
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
@check_security()
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
                import secrets
                return [secrets.randbits(1) for _ in range(n_bits)]
            
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render will supply PORT
    app.run(host="0.0.0.0", port=port, debug=False,use_reloader=False)
