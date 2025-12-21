// Test script to verify input state handling
const Complex = require('./quantum-core.js').Complex;
const QuantumState = require('./quantum-core.js').QuantumState;
const QuantumCircuit = require('./quantum-simulator.js').QuantumCircuit;

console.log('Testing input state preservation...');

// Create circuit
const circuit = new QuantumCircuit(2);

// Set custom input state with complex phase
const complexAmplitude = new Complex(1, 2); // 1 + 2i
const amplitudes = [
    complexAmplitude, // |00⟩
    new Complex(0, 0), // |01⟩
    new Complex(0, 0), // |10⟩
    new Complex(0, 0)  // |11⟩
];

// Set the input state
circuit.state = QuantumState.fromAmplitudes(amplitudes);

console.log('Input state:', circuit.state.toString());
console.log('Input amplitudes:', circuit.state.amplitudes.map(a => a.toString()));

// Run circuit with no gates
const result = circuit.run();

console.log('Output state:', result.finalState.toString());
console.log('Output amplitudes:', result.finalState.amplitudes.map(a => a.toString()));

// Check if phase is preserved
const inputPhase = Math.atan2(amplitudes[0].imag, amplitudes[0].real);
const outputPhase = Math.atan2(result.finalState.amplitudes[0].imag, result.finalState.amplitudes[0].real);

console.log('Input phase:', inputPhase);
console.log('Output phase:', outputPhase);
console.log('Phase preserved:', Math.abs(inputPhase - outputPhase) < 0.001);
