/**
 * Quantum Gates Library
 * Defines all standard quantum gates and their matrix representations
 */

class QuantumGates {
    // Single Qubit Gates
    
    static Hadamard() {
        const invSqrt2 = 1 / Math.sqrt(2);
        return Matrix.fromArray([
            [new Complex(invSqrt2, 0), new Complex(invSqrt2, 0)],
            [new Complex(invSqrt2, 0), new Complex(-invSqrt2, 0)]
        ]);
    }
    
    static PauliX() {
        return Matrix.fromArray([
            [new Complex(0, 0), new Complex(1, 0)],
            [new Complex(1, 0), new Complex(0, 0)]
        ]);
    }
    
    static PauliY() {
        return Matrix.fromArray([
            [new Complex(0, 0), new Complex(0, -1)],
            [new Complex(0, 1), new Complex(0, 0)]
        ]);
    }
    
    static PauliZ() {
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(-1, 0)]
        ]);
    }
    
    static Phase() {
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 1)]
        ]);
    }
    
    static T() {
        const invSqrt2 = 1 / Math.sqrt(2);
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(invSqrt2, invSqrt2)]
        ]);
    }
    
    static RotationX(theta) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return Matrix.fromArray([
            [new Complex(cos, 0), new Complex(0, -sin)],
            [new Complex(0, -sin), new Complex(cos, 0)]
        ]);
    }
    
    static RotationY(theta) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        return Matrix.fromArray([
            [new Complex(cos, 0), new Complex(-sin, 0)],
            [new Complex(sin, 0), new Complex(cos, 0)]
        ]);
    }
    
    static RotationZ(theta) {
        const exp1 = Complex.fromPolar(1, -theta / 2);
        const exp2 = Complex.fromPolar(1, theta / 2);
        return Matrix.fromArray([
            [exp1, new Complex(0, 0)],
            [new Complex(0, 0), exp2]
        ]);
    }
    
    // Multi-Qubit Gates
    
    static CNOT() {
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(1, 0), new Complex(0, 0)]
        ]);
    }
    
    static CZ() {
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(-1, 0)]
        ]);
    }
    
    static CRZ(angle) {
        // Controlled RZ gate: applies RZ rotation to target if control is |1⟩
        const cos = Math.cos(angle / 2);
        const sin = Math.sin(angle / 2);
        const expMinus = Complex.fromPolar(1, -angle/2);
        const expPlus = Complex.fromPolar(1, angle/2);
        
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), expMinus, new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), expPlus]
        ]);
    }
    
    static SWAP() {
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)]
        ]);
    }
    
    static Toffoli() {
        const matrix = Matrix.identity(8);
        matrix.data[6][6] = new Complex(0, 0);
        matrix.data[6][7] = new Complex(1, 0);
        matrix.data[7][6] = new Complex(1, 0);
        matrix.data[7][7] = new Complex(0, 0);
        return matrix;
    }
    
    static Fredkin() {
        const matrix = Matrix.identity(8);
        matrix.data[5][5] = new Complex(0, 0);
        matrix.data[5][6] = new Complex(1, 0);
        matrix.data[6][5] = new Complex(1, 0);
        matrix.data[6][6] = new Complex(0, 0);
        return matrix;
    }
    
    // Three-Qubit Gates
    
    static ControlledPhaseShift(phi) {
        const matrix = Matrix.identity(8);
        matrix.data[7][7] = Complex.fromPolar(1, phi);
        return matrix;
    }
    
    // Custom Gates
    
    static U(theta, phi, lambda) {
        const cos = Math.cos(theta / 2);
        const sin = Math.sin(theta / 2);
        const expPhi = Complex.fromPolar(1, phi);
        const expLambda = Complex.fromPolar(1, lambda);
        const expPhiPlusLambda = Complex.fromPolar(1, phi + lambda);
        
        return Matrix.fromArray([
            [new Complex(cos, 0), new Complex(0, 0)],
            [new Complex(0, 0), new Complex(cos * expLambda.real, cos * expLambda.imag)],
            [new Complex(0, 0), new Complex(sin * expPhi.real, sin * expPhi.imag)],
            [new Complex(-sin, 0), new Complex(cos * expPhiPlusLambda.real, cos * expPhiPlusLambda.imag)]
        ]);
    }
    
    static Rk(k) {
        const angle = 2 * Math.PI / Math.pow(2, k);
        return Matrix.fromArray([
            [new Complex(1, 0), new Complex(0, 0)],
            [new Complex(0, 0), Complex.fromPolar(1, angle)]
        ]);
    }
    
    // Measurement-like Gates (for simulation)
    
    static Measurement() {
        // This is not a true quantum gate, used for simulation purposes
        throw new Error("Measurement is not a quantum gate - use state.measure() instead");
    }
    
    // Gate Factory Methods
    
    static getGate(gateName, ...params) {
        switch (gateName.toUpperCase()) {
            case 'H':
            case 'HADAMARD':
                return this.Hadamard();
            case 'X':
            case 'PAULI_X':
                return this.PauliX();
            case 'Y':
            case 'PAULI_Y':
                return this.PauliY();
            case 'Z':
            case 'PAULI_Z':
                return this.PauliZ();
            case 'S':
            case 'PHASE':
                return this.Phase();
            case 'T':
            case 'T_GATE':
                return this.T();
            case 'RX':
            case 'ROTATION_X':
                if (params.length === 0) throw new Error("RX gate requires angle parameter");
                return this.RotationX(params[0]);
            case 'RY':
            case 'ROTATION_Y':
                if (params.length === 0) throw new Error("RY gate requires angle parameter");
                return this.RotationY(params[0]);
            case 'RZ':
            case 'ROTATION_Z':
                if (params.length === 0) throw new Error("RZ gate requires angle parameter");
                return this.RotationZ(params[0]);
            case 'CNOT':
            case 'CONTROLLED_NOT':
                return this.CNOT();
            case 'CZ':
            case 'CONTROLLED_Z':
                return this.CZ();
            case 'CRZ':
            case 'CONTROLLED_RZ':
                if (params.length === 0) throw new Error("CRZ gate requires angle parameter");
                return this.CRZ(params[0]);
            case 'SWAP':
                return this.SWAP();
            case 'TOFFOLI':
            case 'CCNOT':
                return this.Toffoli();
            case 'FREDKIN':
            case 'CSWAP':
                return this.Fredkin();
            case 'U':
                if (params.length < 3) throw new Error("U gate requires theta, phi, lambda parameters");
                return this.U(params[0], params[1], params[2]);
            case 'RK':
                if (params.length === 0) throw new Error("Rk gate requires k parameter");
                return this.Rk(params[0]);
            default:
                throw new Error(`Unknown gate: ${gateName}`);
        }
    }
    
    // Gate Properties
    
    static getGateInfo(gateName) {
        const info = {
            'H': { name: 'Hadamard', qubits: 1, params: 0, description: 'Creates superposition' },
            'X': { name: 'Pauli-X', qubits: 1, params: 0, description: 'Bit flip gate' },
            'Y': { name: 'Pauli-Y', qubits: 1, params: 0, description: 'Bit and phase flip gate' },
            'Z': { name: 'Pauli-Z', qubits: 1, params: 0, description: 'Phase flip gate' },
            'S': { name: 'Phase', qubits: 1, params: 0, description: 'π/2 phase shift' },
            'T': { name: 'T-Gate', qubits: 1, params: 0, description: 'π/4 phase shift' },
            'RX': { name: 'Rotation-X', qubits: 1, params: 1, description: 'Rotation around X axis' },
            'RY': { name: 'Rotation-Y', qubits: 1, params: 1, description: 'Rotation around Y axis' },
            'RZ': { name: 'Rotation-Z', qubits: 1, params: 1, description: 'Rotation around Z axis' },
            'CNOT': { name: 'Controlled-NOT', qubits: 2, params: 0, description: 'Conditional bit flip' },
            'CZ': { name: 'Controlled-Z', qubits: 2, params: 0, description: 'Conditional phase flip' },
            'SWAP': { name: 'SWAP', qubits: 2, params: 0, description: 'Exchanges two qubits' },
            'TOFFOLI': { name: 'Toffoli', qubits: 3, params: 0, description: 'Controlled-controlled-NOT' },
            'FREDKIN': { name: 'Fredkin', qubits: 3, params: 0, description: 'Controlled-SWAP' }
        };
        
        return info[gateName.toUpperCase()] || null;
    }
    
    static getAllGates() {
        return [
            'H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ',
            'CNOT', 'CZ', 'SWAP', 'TOFFOLI', 'FREDKIN'
        ];
    }
    
    // Gate Composition
    
    static compose(gates) {
        return gates.reduce((result, gate) => gate.multiply(result), Matrix.identity(gates[0].rows));
    }
    
    // Gate Decomposition (simplified)
    
    static decomposeToUniversal(gate) {
        // Any single-qubit gate can be decomposed into rotations
        // This is a simplified version - real decomposition is more complex
        const universalGates = [this.Hadamard(), this.T(), this.Phase()];
        
        // For demonstration, return the gate itself if it's already universal
        if (gate.rows === 2) {
            return [gate];
        }
        
        throw new Error("Gate decomposition not implemented for multi-qubit gates");
    }
    
    // Gate Testing
    
    static verifyUnitary(gate) {
        if (!gate.isUnitary()) {
            throw new Error("Gate is not unitary");
        }
        return true;
    }
    
    static testGateProperties() {
        const tests = [];
        
        // Test Hadamard
        const H = this.Hadamard();
        tests.push({
            name: 'Hadamard',
            isUnitary: H.isUnitary(),
            determinant: H.determinant().toString()
        });
        
        // Test CNOT
        const CNOT = this.CNOT();
        tests.push({
            name: 'CNOT',
            isUnitary: CNOT.isUnitary(),
            determinant: CNOT.determinant().toString()
        });
        
        return tests;
    }
}

// Gate Parameter Dialog Helper
class GateParameterDialog {
    static getParameters(gateName) {
        const info = QuantumGates.getGateInfo(gateName);
        if (!info || info.params === 0) {
            return [];
        }
        
        switch (gateName.toUpperCase()) {
            case 'RX':
            case 'RY':
            case 'RZ':
                return ['angle'];
            case 'U':
                return ['theta', 'phi', 'lambda'];
            case 'RK':
                return ['k'];
            default:
                return [];
        }
    }
    
    static createParameterForm(gateName) {
        const params = this.getParameters(gateName);
        if (params.length === 0) return null;
        
        const form = document.createElement('div');
        form.className = 'parameter-form';
        
        params.forEach(param => {
            const label = document.createElement('label');
            label.textContent = `${param}: `;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.name = param;
            input.placeholder = `Enter ${param}`;
            
            label.appendChild(input);
            form.appendChild(label);
        });
        
        return form;
    }
    
    static getParameterValues(gateName, form) {
        const params = this.getParameters(gateName);
        const values = {};
        
        params.forEach(param => {
            const input = form.querySelector(`input[name="${param}"]`);
            values[param] = parseFloat(input.value) || 0;
        });
        
        return values;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QuantumGates,
        GateParameterDialog
    };
}
