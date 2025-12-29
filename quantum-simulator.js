/**
 * Quantum Circuit Simulator
 * Main simulation engine for building and running quantum circuits
 */

class QuantumCircuit {
    constructor(numQubits) {
        this.numQubits = numQubits;
        this.gates = [];
        this.measurements = [];
        this.state = new QuantumState(numQubits);
        this.executionHistory = [];
    }

    addGate(gateName, targetQubits, params = {}) {
        const gateInfo = QuantumGates.getGateInfo(gateName);
        if (!gateInfo) {
            throw new Error(`Unknown gate: ${gateName}`);
        }

        if (targetQubits.length !== gateInfo.qubits) {
            throw new Error(`Gate ${gateName} requires ${gateInfo.qubits} qubits, got ${targetQubits.length}`);
        }

        // Validate qubit indices
        for (const qubit of targetQubits) {
            if (qubit < 0 || qubit >= this.numQubits) {
                throw new Error(`Qubit index ${qubit} out of range [0, ${this.numQubits - 1}]`);
            }
        }

        const gate = {
            name: gateName,
            targetQubits: [...targetQubits],
            params: { ...params },
            matrix: QuantumGates.getGate(gateName, ...Object.values(params))
        };

        // Handle position-based insertion
        if (params.position !== undefined) {
            // Insert gate at specific position
            const position = params.position;
            
            // Find the correct insertion point based on position
            let insertIndex = this.gates.length;
            
            // Count gates that would appear before this position on any target qubit
            for (let i = 0; i < this.gates.length; i++) {
                const existingGate = this.gates[i];
                // Handle both quantum gates (params.position) and classical gates (position)
                const existingPosition = existingGate.params?.position || existingGate.position || i;
                
                // Check if existing gate overlaps with target qubits and comes before desired position
                const existingGateQubits = existingGate.targetQubits || existingGate.inputQubits || [];
                if (existingGateQubits.some(q => targetQubits.includes(q)) && 
                    existingPosition < position) {
                    insertIndex = i + 1;
                } else if (existingPosition >= position) {
                    break;
                }
            }
            
            // Insert gate at calculated position
            this.gates.splice(insertIndex, 0, gate);
        } else {
            // Append gate as before
            this.gates.push(gate);
        }
        return this;
    }

    addMeasurement(qubit) {
        if (qubit < 0 || qubit >= this.numQubits) {
            throw new Error(`Qubit index ${qubit} out of range`);
        }

        this.measurements.push({ qubit, result: null });
        return this;
    }

    reset() {
        // Don't reset the state - preserve the input state
        this.measurements.forEach(m => m.result = null);
        this.executionHistory = [];
        return this;
    }

    run(shots = 1) {
        const results = [];

        for (let shot = 0; shot < shots; shot++) {
            this.reset();
            const shotResult = this.executeSingleShot();
            results.push(shotResult);
        }

        return this.aggregateResults(results);
    }

    executeSingleShot() {
        console.log('=== EXECUTE SINGLE SHOT ===');
        console.log('Input state before execution:', this.state.toString());
        console.log('Input state amplitudes:', this.state.amplitudes.map(a => a.toString()));
        
        const result = {
            initialState: this.state.clone(),
            finalState: null,
            measurements: [],
            gateOperations: []
        };

        // Apply all gates
        for (const gate of this.gates) {
            const beforeState = this.state.clone();
            
            // Handle classical gates differently
            if (gate.type === 'classical') {
                this.applyClassicalGate(gate);
            } else {
                // Ensure gate has a matrix
                if (!gate.matrix) {
                    gate.matrix = QuantumGates.getGate(gate.name, ...(gate.params ? Object.values(gate.params) : []));
                }
                this.state.applyGate(gate.matrix, gate.targetQubits);
            }

            result.gateOperations.push({
                gate: gate.name,
                targetQubits: gate.targetQubits,
                params: gate.params,
                beforeState: beforeState,
                afterState: this.state.clone()
            });
        }

        // Perform measurements
        for (const measurement of this.measurements) {
            const measurementResult = this.measureQubit(measurement.qubit);
            measurement.result = measurementResult;
            result.measurements.push(measurementResult);
        }

        result.finalState = this.state.clone();
        console.log('Final state after execution:', this.state.toString());
        console.log('Final state amplitudes:', this.state.amplitudes.map(a => a.toString()));
        this.executionHistory.push(result);

        return result;
    }

    applyClassicalGate(gate) {
        // Classical gate execution - works on definite bit values
        const numQubits = this.state.numQubits;
        const dimension = Math.pow(2, numQubits);
        
        console.log(`Applying classical gate ${gate.name} to state:`, this.state.amplitudes.map(a => a.toString()));
        
        if (gate.name === 'NOT') {
            // NOT gate: flip single bit
            const inputQubit = gate.inputQubits[0];
            const outputQubit = gate.outputQubit;
            
            console.log(`NOT gate: input qubit=${inputQubit}, output qubit=${outputQubit}`);
            
            // Create new amplitudes array
            const newAmplitudes = Array(dimension).fill().map(() => new Complex(0, 0));
            
            // For each basis state, flip the bit and move amplitude
            for (let i = 0; i < dimension; i++) {
                const inputBit = (i >> (numQubits - 1 - inputQubit)) & 1;
                const flippedBit = 1 - inputBit;
                
                // Calculate new state index with flipped bit
                let newStateIndex = i;
                if (flippedBit !== ((i >> (numQubits - 1 - outputQubit)) & 1)) {
                    newStateIndex = i ^ (1 << (numQubits - 1 - outputQubit));
                }
                
                newAmplitudes[newStateIndex] = this.state.amplitudes[i].clone();
                console.log(`State ${i.toString(2).padStart(numQubits, '0')}: inputBit=${inputBit}, flippedBit=${flippedBit}, newIndex=${newStateIndex.toString(2).padStart(numQubits, '0')}`);
            }
            
            this.state.amplitudes = newAmplitudes;
            console.log(`NOT gate result:`, this.state.amplitudes.map(a => a.toString()));
            
        } else if (gate.name === 'AND') {
            // AND gate: output = input1 AND input2 (measurement-based approach)
            const inputQubit1 = gate.inputQubits[0];
            const inputQubit2 = gate.inputQubits[1];
            const outputQubit = gate.outputQubit;
            
            console.log(`AND gate: input qubits=[${inputQubit1}, ${inputQubit2}], output qubit=${outputQubit}`);
            
            // For definite states (like |00⟩, |01⟩, |10⟩, |11⟩), just apply classical logic
            const numQubits = this.state.numQubits;
            const dimension = Math.pow(2, numQubits);
            
            // Find which basis state we're in
            let stateIndex = -1;
            for (let i = 0; i < dimension; i++) {
                if (this.state.amplitudes[i].magnitude() > 0.9) {
                    stateIndex = i;
                    break;
                }
            }
            
            if (stateIndex >= 0) {
                // Extract bit values
                const bit1 = (stateIndex >> (numQubits - 1 - inputQubit1)) & 1;
                const bit2 = (stateIndex >> (numQubits - 1 - inputQubit2)) & 1;
                const andResult = bit1 & bit2;
                
                console.log(`AND gate: state=${stateIndex.toString(2).padStart(numQubits, '0')}, bit1=${bit1}, bit2=${bit2}, andResult=${andResult}`);
                
                // Create new state with AND result
                const newAmplitudes = Array(dimension).fill().map(() => new Complex(0, 0));
                
                // Build target state index: same as input but with AND result on output qubit
                let targetIndex = stateIndex;
                const outputBitMask = 1 << (numQubits - 1 - outputQubit);
                const andResultMask = andResult << (numQubits - 1 - outputQubit);
                
                // Clear the output bit position
                targetIndex = targetIndex & ~outputBitMask;
                // Set the AND result on the output bit position
                targetIndex = targetIndex | andResultMask;
                
                newAmplitudes[targetIndex] = new Complex(1, 0);
                this.state.amplitudes = newAmplitudes;
                
                console.log(`AND gate result: state ${targetIndex.toString(2).padStart(numQubits, '0')}`);
            }
        } else if (gate.name === 'OR') {
            // OR gate: output = input1 OR input2 (measurement-based approach)
            const inputQubit1 = gate.inputQubits[0];
            const inputQubit2 = gate.inputQubits[1];
            const outputQubit = gate.outputQubit;
            
            console.log(`OR gate: input qubits=[${inputQubit1}, ${inputQubit2}], output qubit=${outputQubit}`);
            
            // For definite states (like |00⟩, |01⟩, |10⟩, |11⟩), just apply classical logic
            const numQubits = this.state.numQubits;
            const dimension = Math.pow(2, numQubits);
            
            // Find which basis state we're in
            let stateIndex = -1;
            for (let i = 0; i < dimension; i++) {
                if (this.state.amplitudes[i].magnitude() > 0.9) {
                    stateIndex = i;
                    break;
                }
            }
            
            if (stateIndex >= 0) {
                // Extract bit values
                const bit1 = (stateIndex >> (numQubits - 1 - inputQubit1)) & 1;
                const bit2 = (stateIndex >> (numQubits - 1 - inputQubit2)) & 1;
                const orResult = bit1 | bit2;
                
                console.log(`OR gate: state=${stateIndex.toString(2).padStart(numQubits, '0')}, bit1=${bit1}, bit2=${bit2}, orResult=${orResult}`);
                
                // Create new state with OR result
                const newAmplitudes = Array(dimension).fill().map(() => new Complex(0, 0));
                
                // Build target state index: same as input but with OR result on output qubit
                let targetIndex = stateIndex;
                const outputBitMask = 1 << (numQubits - 1 - outputQubit);
                const orResultMask = orResult << (numQubits - 1 - outputQubit);
                
                // Clear the output bit position
                targetIndex = targetIndex & ~outputBitMask;
                // Set the OR result on the output bit position
                targetIndex = targetIndex | orResultMask;
                
                newAmplitudes[targetIndex] = new Complex(1, 0);
                this.state.amplitudes = newAmplitudes;
                
                console.log(`OR gate result: state ${targetIndex.toString(2).padStart(numQubits, '0')}`);
            }
        }
    }

    measureJointState(qubits) {
        // Measure multiple qubits jointly to preserve quantum correlation
        const numQubits = this.state.numQubits;
        const dimension = Math.pow(2, numQubits);
        
        // Calculate probabilities for each basis state
        const probabilities = [];
        for (let i = 0; i < dimension; i++) {
            const probability = this.state.amplitudes[i].magnitude() * this.state.amplitudes[i].magnitude();
            probabilities.push(probability);
        }
        
        // Random measurement based on actual state probabilities
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < dimension; i++) {
            cumulative += probabilities[i];
            if (random < cumulative) {
                // Collapse to measured state
                this.state.amplitudes = Array(dimension).fill().map(() => new Complex(0, 0));
                this.state.amplitudes[i] = new Complex(1, 0);
                
                // Extract bit values for each qubit
                const result = {};
                for (const qubit of qubits) {
                    result[qubit] = (i >> (numQubits - 1 - qubit)) & 1;
                }
                
                console.log(`Measured state ${i.toString(2).padStart(numQubits, '0')}, qubits:`, result);
                return result;
            }
        }
        
        // Fallback (shouldn't happen)
        const lastIndex = dimension - 1;
        this.state.amplitudes = Array(dimension).fill().map(() => new Complex(0, 0));
        this.state.amplitudes[lastIndex] = new Complex(1, 0);
        
        const result = {};
        for (const qubit of qubits) {
            result[qubit] = (lastIndex >> (numQubits - 1 - qubit)) & 1;
        }
        
        return result;
    }
    
    prepareQubitState(qubit, value) {
        // Prepare a specific qubit in |0⟩ or |1⟩ state
        const numQubits = this.state.numQubits;
        const dimension = Math.pow(2, numQubits);
        
        // Create new amplitudes with the target qubit in the desired state
        const newAmplitudes = this.state.amplitudes.map((amp, index) => {
            const bitValue = (index >> (numQubits - 1 - qubit)) & 1;
            
            if (bitValue === value) {
                // This amplitude should remain unchanged
                return amp.clone();
            } else {
                // This amplitude should become zero
                return new Complex(0, 0);
            }
        });
        
        // Check if we created a zero vector and fix it
        const hasNonZero = newAmplitudes.some(amp => amp.magnitude() > 1e-10);
        if (!hasNonZero) {
            console.log('Created zero vector, keeping original state');
            return; // Don't update if it would create zero vector
        }
        
        this.state.amplitudes = newAmplitudes;
    }
    
    measureQubit(qubit) {
        // Get probabilities for measuring this specific qubit
        const probabilities = this.getQubitProbabilities(qubit);

        // Random measurement
        const random = Math.random();
        const result = random < probabilities[0] ? 0 : 1;

        // Collapse the state based on measurement result
        this.collapseQubit(qubit, result);

        return {
            qubit,
            result,
            probabilities
        };
    }

    getQubitProbabilities(qubit) {
        const prob0 = 0;
        const prob1 = 0;

        for (let i = 0; i < this.state.dimension; i++) {
            const bit = (i >> (this.numQubits - 1 - qubit)) & 1;
            const probability = this.state.amplitudes[i].magnitude() ** 2;

            if (bit === 0) {
                prob0 += probability;
            } else {
                prob1 += probability;
            }
        }

        return [prob0, prob1];
    }

    collapseQubit(qubit, result) {
        const newAmplitudes = Array(this.state.dimension).fill().map(() => new Complex(0, 0));
        let norm = 0;

        for (let i = 0; i < this.state.dimension; i++) {
            const bit = (i >> (this.numQubits - 1 - qubit)) & 1;
            if (bit === result) {
                newAmplitudes[i] = this.state.amplitudes[i];
                norm += this.state.amplitudes[i].magnitude() ** 2;
            }
        }

        // Normalize the collapsed state
        if (norm > 1e-10) {
            this.state.amplitudes = newAmplitudes.map(amp =>
                amp.divide(new Complex(Math.sqrt(norm), 0))
            );
        }
    }

    aggregateResults(results) {
        if (results.length === 1) {
            return results[0];
        }

        // Aggregate measurement statistics
        const measurementStats = {};
        const allBitStrings = {};

        results.forEach(result => {
            // Aggregate individual qubit measurements
            result.measurements.forEach(meas => {
                if (!measurementStats[meas.qubit]) {
                    measurementStats[meas.qubit] = { 0: 0, 1: 0 };
                }
                measurementStats[meas.qubit][meas.result]++;
            });

            // Aggregate full bit strings
            const bitString = result.finalState.amplitudes
                .map((amp, i) => ({ amp: amp.magnitude() ** 2, index: i }))
                .sort((a, b) => b.amp - a.amp)[0].index
                .toString(2)
                .padStart(this.numQubits, '0');

            allBitStrings[bitString] = (allBitStrings[bitString] || 0) + 1;
        });

        // Convert to probabilities
        const totalShots = results.length;
        Object.keys(measurementStats).forEach(qubit => {
            measurementStats[qubit][0] /= totalShots;
            measurementStats[qubit][1] /= totalShots;
        });

        Object.keys(allBitStrings).forEach(bitString => {
            allBitStrings[bitString] /= totalShots;
        });

        return {
            ...results[0],
            aggregated: true,
            shots: totalShots,
            measurementStats,
            bitStringProbabilities: allBitStrings
        };
    }

    getStateVector() {
        return this.state.amplitudes.map((amp, i) => ({
            index: i,
            bitString: i.toString(2).padStart(this.numQubits, '0'),
            amplitude: amp,
            probability: amp.magnitude() ** 2
        }));
    }

    getDensityMatrix() {
        return this.state.getDensityMatrix();
    }

    clone() {
        const cloned = new QuantumCircuit(this.numQubits);
        cloned.gates = [...this.gates];
        cloned.measurements = [...this.measurements];
        cloned.state = this.state.clone();
        cloned.executionHistory = [...this.executionHistory];
        return cloned;
    }

    toString() {
        let description = `Quantum Circuit (${this.numQubits} qubits)\n`;
        description += `Gates: ${this.gates.length}\n`;
        description += `Measurements: ${this.measurements.length}\n\n`;

        this.gates.forEach((gate, i) => {
            description += `${i + 1}. ${gate.name} on qubits [${gate.targetQubits.join(', ')}]\n`;
        });

        return description;
    }
}

// Circuit Builder Class
class CircuitBuilder {
    constructor() {
        this.circuit = null;
        this.maxQubits = 8;
        this.currentQubits = 2;
    }

    createCircuit(numQubits = 2) {
        this.circuit = new QuantumCircuit(numQubits);
        this.currentQubits = numQubits;
        return this;
    }

    addGate(gateName, targetQubits, params = {}) {
        if (!this.circuit) {
            throw new Error("No circuit created. Call createCircuit() first.");
        }

        this.circuit.addGate(gateName, targetQubits, params);
        return this;
    }

    addMeasurement(qubit) {
        if (!this.circuit) {
            throw new Error("No circuit created. Call createCircuit() first.");
        }

        this.circuit.addMeasurement(qubit);
        return this;
    }

    run(shots = 1) {
        if (!this.circuit) {
            throw new Error("No circuit created. Call createCircuit() first.");
        }

        return this.circuit.run(shots);
    }

    getCircuit() {
        return this.circuit;
    }

    reset() {
        if (this.circuit) {
            // Clear gates but preserve the circuit structure
            this.circuit.gates = [];
            this.circuit.measurements = [];
        }
        return this;
    }
}

// Pre-built Quantum Algorithms
class QuantumAlgorithms {
    static DeutschJozsa(config = {}) {
        const { 
            numQubits = 2, 
            functionType = 'constant',  // 'constant' or 'balanced'
            constantValue = 0,          // 0 or 1 for constant functions
            balancedType = 'first-bit', // 'first-bit', 'parity', 'custom'
            customInputs = null          // Array of input indices where f(x) = 1
        } = config;
        
        const circuit = new QuantumCircuit(numQubits);

        // Initialize qubits: first n-1 for input, last for ancilla
        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);
        }

        // Prepare ancilla qubit
        circuit.addGate('X', [numQubits - 1]);
        circuit.addGate('H', [numQubits - 1]);

        // Apply oracle based on function type
        if (functionType === 'constant') {
            if (constantValue === 1) {
                // For constant f(x) = 1, apply X to ancilla
                circuit.addGate('X', [numQubits - 1]);
            }
            // For constant f(x) = 0, do nothing (identity)
        } else if (functionType === 'balanced') {
            if (balancedType === 'first-bit') {
                // Simple balanced function: f(x) = x0 (first input bit)
                circuit.addGate('CNOT', [0, numQubits - 1]);
            } else if (balancedType === 'parity') {
                // Balanced function: f(x) = parity of all input bits
                const inputQubits = numQubits - 1;
                for (let i = 0; i < inputQubits; i++) {
                    circuit.addGate('CNOT', [i, numQubits - 1]);
                }
            } else if (balancedType === 'custom' && customInputs) {
                // Custom balanced function using multi-controlled gates
                const inputQubits = numQubits - 1;
                
                // For each input where f(x) = 1, apply a multi-controlled X
                customInputs.forEach(inputIndex => {
                    // Create multi-controlled X gate
                    const controls = [];
                    for (let i = 0; i < inputQubits; i++) {
                        const bit = (inputIndex >> (inputQubits - 1 - i)) & 1;
                        if (bit === 0) {
                            // If bit is 0, apply X first to make it controlled on |1⟩
                            circuit.addGate('X', [i]);
                            controls.push(i);
                        } else {
                            controls.push(i);
                        }
                    }
                    
                    // Apply multi-controlled X to ancilla
                    if (controls.length === 1) {
                        circuit.addGate('CNOT', [controls[0], numQubits - 1]);
                    } else if (controls.length === 2) {
                        circuit.addGate('TOFFOLI', [controls[0], controls[1], numQubits - 1]);
                    }
                    // For more controls, would need more complex implementation
                    
                    // Uncompute the X gates
                    for (let i = 0; i < inputQubits; i++) {
                        const bit = (inputIndex >> (inputQubits - 1 - i)) & 1;
                        if (bit === 0) {
                            circuit.addGate('X', [i]);
                        }
                    }
                });
            }
        }

        // Apply Hadamard to input qubits
        for (let i = 0; i < numQubits - 1; i++) {
            circuit.addGate('H', [i]);
        }

        // Add measurements for input qubits to read the result
        for (let i = 0; i < numQubits - 1; i++) {
            circuit.addMeasurement(i);
        }

        // Store metadata for explanation
        let description = `Determines if function f(x) is ${functionType}. `;
        if (functionType === 'constant') {
            description += `Result: |00...0⟩ = constant, other states = balanced`;
        } else {
            description += `Result: |00...0⟩ = constant, other states = balanced`;
        }

        circuit.metadata = {
            algorithm: 'Deutsch-Jozsa',
            functionType,
            constantValue,
            balancedType,
            customInputs,
            description,
            // Hide specific details until after circuit runs
            hideDetails: true
        };

        return circuit;
    }

    static GroverSearch(config = {}) {
        const {
            numQubits = 3,
            dataset = null,
            targetElement = null,
            markedIndex = null,
            iterations = null
        } = config;

        // Validate and set up search space
        const searchSpaceSize = Math.pow(2, numQubits);
        let actualMarkedIndex;

        if (dataset && targetElement !== null) {
            // User provided dataset and target
            if (dataset.length > searchSpaceSize) {
                throw new Error(`Dataset size (${dataset.length}) exceeds search space (${searchSpaceSize})`);
            }
            actualMarkedIndex = dataset.indexOf(targetElement);
            if (actualMarkedIndex === -1) {
                throw new Error(`Target element not found in dataset`);
            }
        } else if (markedIndex !== null) {
            // Use provided marked index
            if (markedIndex >= searchSpaceSize) {
                throw new Error(`Marked index ${markedIndex} out of range for ${numQubits} qubits`);
            }
            actualMarkedIndex = markedIndex;
        } else {
            // Default behavior - use middle element
            actualMarkedIndex = Math.floor(searchSpaceSize / 2);
        }

        const circuit = new QuantumCircuit(numQubits);

        // Store metadata for explanation
        circuit.metadata = {
            algorithm: 'Grover\'s Search',
            searchSpaceSize,
            markedIndex: actualMarkedIndex,
            targetElement: dataset ? dataset[actualMarkedIndex] : actualMarkedIndex,
            dataset: dataset || Array.from({length: searchSpaceSize}, (_, i) => i),
            iterations: iterations || Math.floor(Math.PI / 4 * Math.sqrt(searchSpaceSize)),
            description: `Quantum search algorithm that finds ${dataset ? dataset[actualMarkedIndex] : 'element ' + actualMarkedIndex} in ${searchSpaceSize} possibilities using quantum superposition and amplitude amplification`
        };

        // Initialize superposition
        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);
        }

        // Calculate optimal iterations
        const optimalIterations = iterations || Math.floor(Math.PI / 4 * Math.sqrt(searchSpaceSize));

        // Apply Grover iterations
        for (let iter = 0; iter < optimalIterations; iter++) {
            // Oracle for marked state
            const oracle = this.createOracle(numQubits, actualMarkedIndex);
            circuit.gates.push(...oracle);

            // Diffusion operator
            this.addGroverIteration(circuit, numQubits);
        }

        return circuit;
    }

    static createOracle(numQubits, markedIndex) {
        const gates = [];

        // Create phase oracle using multi-controlled Z gate
        for (let i = 0; i < numQubits; i++) {
            const bit = (markedIndex >> (numQubits - 1 - i)) & 1;
            if (bit === 0) {
                gates.push({
                    name: 'X',
                    targetQubits: [i],
                    params: {},
                    matrix: QuantumGates.PauliX()
                });
            }
        }

        // Multi-controlled Z (simplified as H-X-H for single qubit case)
        if (numQubits === 1) {
            gates.push({
                name: 'Z',
                targetQubits: [0],
                params: {},
                matrix: QuantumGates.PauliZ()
            });
        } else if (numQubits === 2) {
            gates.push({
                name: 'CZ',
                targetQubits: [0, 1],
                params: {},
                matrix: QuantumGates.CZ()
            });
        } else {
            // For more qubits, use Toffoli with ancilla (simplified)
            gates.push({
                name: 'H',
                targetQubits: [numQubits - 1],
                params: {},
                matrix: QuantumGates.Hadamard()
            });
            gates.push({
                name: 'TOFFOLI',
                targetQubits: [0, 1, numQubits - 1],
                params: {},
                matrix: QuantumGates.Toffoli()
            });
            gates.push({
                name: 'H',
                targetQubits: [numQubits - 1],
                params: {},
                matrix: QuantumGates.Hadamard()
            });
        }

        // Uncompute X gates
        for (let i = numQubits - 1; i >= 0; i--) {
            const bit = (markedIndex >> (numQubits - 1 - i)) & 1;
            if (bit === 0) {
                gates.push({
                    name: 'X',
                    targetQubits: [i],
                    params: {},
                    matrix: QuantumGates.PauliX()
                });
            }
        }

        return gates;
    }

    static addGroverIteration(circuit, numQubits) {
        // Diffusion operator
        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);
        }

        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('X', [i]);
        }

        // Multi-controlled Z
        if (numQubits === 1) {
            circuit.addGate('Z', [0]);
        } else if (numQubits === 2) {
            circuit.addGate('CZ', [0, 1]);
        } else {
            // Simplified version
            circuit.addGate('H', [numQubits - 1]);
            circuit.addGate('TOFFOLI', [0, 1, numQubits - 1]);
            circuit.addGate('H', [numQubits - 1]);
        }

        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('X', [i]);
        }

        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);
        }
    }

    static QuantumFourierTransform(numQubits) {
        const circuit = new QuantumCircuit(numQubits);

        // Apply Hadamard and controlled rotations
        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);

            // Apply controlled RZ gates
            for (let j = i + 1; j < numQubits; j++) {
                const angle = Math.PI / Math.pow(2, j - i);
                circuit.addGate('RZ', [j], { angle });
            }
        }

        // Swap qubits to reverse order (optional for QFT)
        for (let i = 0; i < Math.floor(numQubits / 2); i++) {
            circuit.addGate('SWAP', [i, numQubits - 1 - i]);
        }

        // Store metadata for explanation
        circuit.metadata = {
            algorithm: 'Quantum Fourier Transform',
            numQubits,
            description: `Transforms computational basis to Fourier basis on ${numQubits} qubits`
        };

        return circuit;
    }

    static QuantumTeleportation(config = {}) {
        const { 
            initialState = '|+⟩',  // State to teleport: '|0⟩', '|1⟩', '|+⟩', '|-⟩'
            numQubits = 3 
        } = config;
        
        const circuit = new QuantumCircuit(numQubits);

        // Prepare the state to be teleported on qubit 0
        if (initialState === '|1⟩') {
            circuit.addGate('X', [0]);
        } else if (initialState === '|+⟩') {
            circuit.addGate('H', [0]);
        } else if (initialState === '|-⟩') {
            circuit.addGate('H', [0]);
            circuit.addGate('Z', [0]);
        }
        // For '|0⟩', do nothing (already in ground state)

        // Create entangled pair between qubits 1 and 2 (Alice and Bob)
        circuit.addGate('H', [1]);
        circuit.addGate('CNOT', [1, 2]);

        // Bell measurement on qubits 0 and 1 (Alice's qubits)
        circuit.addGate('CNOT', [0, 1]);
        circuit.addGate('H', [0]);

        // Measure qubits 0 and 1 to get classical bits
        circuit.addMeasurement(0);
        circuit.addMeasurement(1);

        // Note: The conditional corrections (X and Z gates on qubit 2) 
        // would be applied based on measurement results in a real system
        // In this simulator, we measure all qubits to show the teleportation result
        circuit.addMeasurement(2);

        // Store metadata for explanation
        circuit.metadata = {
            algorithm: 'Quantum Teleportation',
            initialState,
            description: `Teleports quantum state ${initialState} from qubit 0 to qubit 2 using entanglement`
        };

        return circuit;
    }

    static SuperdenseCoding() {
        const circuit = new QuantumCircuit(2);

        // Create entangled pair
        circuit.addGate('H', [0]);
        circuit.addGate('CNOT', [0, 1]);

        // Encoding (would depend on message to send)
        // circuit.addGate('X', [0]); // for bit 1
        // circuit.addGate('Z', [0]); // for bit 2

        return circuit;
    }
}

// Performance Benchmarking
class QuantumBenchmark {
    static runBenchmarks() {
        const results = {
            gateOperations: this.benchmarkGateOperations(),
            stateVectorSize: this.benchmarkStateVectorSize(),
            circuitDepth: this.benchmarkCircuitDepth(),
            memoryUsage: this.benchmarkMemoryUsage()
        };

        return results;
    }

    static benchmarkGateOperations() {
        const gateCounts = {};
        const gateTimes = {};

        const gates = ['H', 'X', 'Y', 'Z', 'CNOT', 'SWAP'];

        gates.forEach(gate => {
            const times = [];

            for (let i = 0; i < 100; i++) {
                const start = performance.now();

                if (gate === 'CNOT' || gate === 'SWAP') {
                    const circuit = new QuantumCircuit(2);
                    circuit.addGate(gate, [0, 1]);
                    circuit.run();
                } else {
                    const circuit = new QuantumCircuit(1);
                    circuit.addGate(gate, [0]);
                    circuit.run();
                }

                const end = performance.now();
                times.push(end - start);
            }

            gateTimes[gate] = times.reduce((a, b) => a + b) / times.length;
        });

        return gateTimes;
    }

    static benchmarkStateVectorSize() {
        const results = {};

        for (let qubits = 1; qubits <= 8; qubits++) {
            const start = performance.now();

            const circuit = new QuantumCircuit(qubits);
            for (let i = 0; i < qubits; i++) {
                circuit.addGate('H', [i]);
            }
            circuit.run();

            const end = performance.now();
            results[qubits] = {
                time: end - start,
                dimension: Math.pow(2, qubits),
                memory: Math.pow(2, qubits) * 16 // bytes for complex numbers
            };
        }

        return results;
    }

    static benchmarkCircuitDepth() {
        const results = {};

        for (let depth = 1; depth <= 20; depth++) {
            const start = performance.now();

            const circuit = new QuantumCircuit(3);
            for (let i = 0; i < depth; i++) {
                circuit.addGate('H', [i % 3]);
                if (i % 2 === 0) {
                    circuit.addGate('CNOT', [0, 1]);
                }
            }
            circuit.run();

            const end = performance.now();
            results[depth] = end - start;
        }

        return results;
    }

    static benchmarkMemoryUsage() {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }

        return { error: "Memory API not available" };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QuantumCircuit,
        CircuitBuilder,
        QuantumAlgorithms,
        QuantumBenchmark
    };
}
