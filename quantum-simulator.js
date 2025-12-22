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
                const existingPosition = existingGate.params.position || i;
                
                // Check if existing gate overlaps with target qubits and comes before desired position
                if (existingGate.targetQubits.some(q => targetQubits.includes(q)) && 
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
            this.state.applyGate(gate.matrix, gate.targetQubits);

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
        this.circuit = null;
        return this;
    }
}

// Pre-built Quantum Algorithms
class QuantumAlgorithms {
    static DeutschJozsa() {
        const circuit = new QuantumCircuit(2);

        // Deutsch-Jozsa algorithm for constant function f(x) = 0
        circuit.addGate('H', [0]);
        circuit.addGate('H', [1]);
        circuit.addGate('X', [1]);
        circuit.addGate('H', [1]);
        circuit.addGate('CNOT', [0, 1]);
        circuit.addGate('H', [0]);

        return circuit;
    }

    static GroverSearch(numQubits = 3, markedIndex = 5) {
        const circuit = new QuantumCircuit(numQubits);

        // Initialize superposition
        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);
        }

        // Oracle for marked state
        const oracle = this.createOracle(numQubits, markedIndex);
        circuit.gates.push(...oracle);

        // Grover iteration (simplified - normally would repeat sqrt(N) times)
        this.addGroverIteration(circuit, numQubits);

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

        for (let i = 0; i < numQubits; i++) {
            circuit.addGate('H', [i]);

            for (let j = i + 1; j < numQubits; j++) {
                const angle = Math.PI / Math.pow(2, j - i + 1);
                circuit.addGate('RZ', [j], { angle });
            }
        }

        // Swap qubits (optional for QFT)
        for (let i = 0; i < numQubits / 2; i++) {
            circuit.addGate('SWAP', [i, numQubits - 1 - i]);
        }

        return circuit;
    }

    static QuantumTeleportation() {
        const circuit = new QuantumCircuit(3);

        // Create entangled pair between qubits 1 and 2
        circuit.addGate('H', [1]);
        circuit.addGate('CNOT', [1, 2]);

        // Bell measurement on qubits 0 and 1
        circuit.addGate('CNOT', [0, 1]);
        circuit.addGate('H', [0]);

        // Measure qubits 0 and 1
        circuit.addMeasurement(0);
        circuit.addMeasurement(1);

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
