/**
 * Quantum Visualization Library
 * Provides visualization tools for quantum states and circuits
 */

class QuantumVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.colors = {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            background: '#f3f4f6',
            text: '#111827',
            grid: '#e5e7eb'
        };
    }
    
    initializeCanvas(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        return this;
    }
    
    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // State Vector Visualization
    drawStateVector(stateVector) {
        if (!this.ctx) return;
        
        this.clear();
        
        const padding = 40;
        const width = this.canvas.width - 2 * padding;
        const height = this.canvas.height - 2 * padding;
        
        // Draw axes
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.canvas.height - padding);
        this.ctx.lineTo(this.canvas.width - padding, this.canvas.height - padding);
        this.ctx.stroke();
        
        // Draw bars for each basis state
        const barWidth = width / stateVector.length;
        const maxProb = Math.max(...stateVector.map(s => s.probability));
        
        stateVector.forEach((state, i) => {
            const x = padding + i * barWidth;
            const barHeight = (state.probability / maxProb) * height;
            const y = this.canvas.height - padding - barHeight;
            
            // Draw bar
            this.ctx.fillStyle = this.colors.primary;
            this.ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);
            
            // Draw label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(state.bitString, x + barWidth / 2, this.canvas.height - padding + 15);
            
            // Draw probability
            if (state.probability > 0.01) {
                this.ctx.fillText(state.probability.toFixed(3), x + barWidth / 2, y - 5);
            }
        });
        
        // Draw title
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('State Vector Probabilities', this.canvas.width / 2, 20);
    }
    
    // Bloch Sphere Visualization
    drawBlochSphere(stateVector) {
        if (!this.ctx) return;
        
        this.clear();
        
        // Calculate number of qubits from state vector length
        const numQubits = Math.log2(stateVector.length);
        
        if (numQubits === 1) {
            // Single qubit - draw one large sphere
            this.drawSingleBlochSphere(stateVector, 0, 0, this.canvas.width, this.canvas.height, 'Qubit 0');
        } else {
            // Multiple qubits - draw multiple spheres in a grid
            const cols = Math.ceil(Math.sqrt(numQubits));
            const rows = Math.ceil(numQubits / cols);
            const sphereWidth = this.canvas.width / cols;
            const sphereHeight = this.canvas.height / rows;
            
            for (let i = 0; i < numQubits; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * sphereWidth;
                const y = row * sphereHeight;
                
                // Extract individual qubit state
                const qubitState = this.extractQubitState(stateVector, i);
                
                // Draw sphere for this qubit
                this.drawSingleBlochSphere(
                    qubitState, 
                    x, y, 
                    sphereWidth, sphereHeight, 
                    `Qubit ${i}`
                );
            }
        }
    }
    
    // Extract individual qubit state from multi-qubit state vector
    extractQubitState(stateVector, qubitIndex) {
        console.log('extractQubitState called with stateVector:', stateVector, 'qubitIndex:', qubitIndex);
        
        const numQubits = Math.log2(stateVector.length);
        
        // Calculate the reduced density matrix for this qubit by tracing out others
        // This is a simplified but correct approach for extracting individual qubit states
        const dim = Math.pow(2, numQubits);
        const qubitState = [];
        
        // For each basis state of the target qubit (|0⟩ and |1⟩)
        for (let targetBit = 0; targetBit < 2; targetBit++) {
            let amplitude = new Complex(0, 0);
            let probability = 0;
            
            // Sum over all states where the target qubit has the specified value
            for (let i = 0; i < dim; i++) {
                // Check if this state has the target qubit in the desired state
                const bitAtPosition = (i >> (numQubits - 1 - qubitIndex)) & 1;
                
                if (bitAtPosition === targetBit) {
                    console.log(`State ${i}:`, stateVector[i]);
                    
                    // Handle both raw Complex objects and objects with .amplitude property
                    let stateAmplitude;
                    let stateProbability;
                    
                    if (stateVector[i].amplitude) {
                        // Object with .amplitude property
                        stateAmplitude = stateVector[i].amplitude;
                        stateProbability = stateVector[i].probability;
                    } else {
                        // Raw Complex object - calculate probability from magnitude
                        stateAmplitude = stateVector[i];
                        stateProbability = stateVector[i].magnitude() ** 2;
                    }
                    
                    console.log(`Adding amplitude:`, stateAmplitude, `probability:`, stateProbability);
                    amplitude = amplitude.add(stateAmplitude);
                    probability += stateProbability;
                }
            }
            
            qubitState.push({
                amplitude: amplitude,
                probability: probability
            });
        }
        
        // Normalize the extracted qubit state
        // Calculate the norm as sqrt(sum of |amplitude|^2)
        const amp0MagSq = qubitState[0].amplitude.real * qubitState[0].amplitude.real + 
                         qubitState[0].amplitude.imag * qubitState[0].amplitude.imag;
        const amp1MagSq = qubitState[1].amplitude.real * qubitState[1].amplitude.real + 
                         qubitState[1].amplitude.imag * qubitState[1].amplitude.imag;
        const norm = Math.sqrt(amp0MagSq + amp1MagSq);
        
        console.log(`Amplitude magnitudes squared: |amp0|^2=${amp0MagSq}, |amp1|^2=${amp1MagSq}`);
        console.log(`Normalization factor (norm): ${norm}`);
        
        if (norm > 0) {
            // Normalize amplitudes by dividing by the norm
            const amp0Real = qubitState[0].amplitude.real / norm;
            const amp0Imag = qubitState[0].amplitude.imag / norm;
            const amp1Real = qubitState[1].amplitude.real / norm;
            const amp1Imag = qubitState[1].amplitude.imag / norm;
            
            console.log(`Before normalization - Amp0: (${qubitState[0].amplitude.real}, ${qubitState[0].amplitude.imag}), Amp1: (${qubitState[1].amplitude.real}, ${qubitState[1].amplitude.imag})`);
            
            // Create new normalized Complex objects
            qubitState[0].amplitude = new Complex(amp0Real, amp0Imag);
            qubitState[1].amplitude = new Complex(amp1Real, amp1Imag);
            
            // Update probabilities to match normalized amplitudes
            qubitState[0].probability = amp0Real * amp0Real + amp0Imag * amp0Imag;
            qubitState[1].probability = amp1Real * amp1Real + amp1Imag * amp1Imag;
            
            console.log(`After normalization - Amp0: (${amp0Real}, ${amp0Imag}), Amp1: (${amp1Real}, ${amp1Imag})`);
            console.log(`Normalized probabilities: P0=${qubitState[0].probability}, P1=${qubitState[1].probability}`);
            console.log(`Sum of normalized probabilities: ${qubitState[0].probability + qubitState[1].probability}`);
        }
        
        console.log(`Qubit ${qubitIndex} extracted state:`, qubitState);
        return qubitState;
    }
    
    // Draw a single Bloch sphere
    drawSingleBlochSphere(stateVector, offsetX, offsetY, width, height, title) {
        console.log(`drawSingleBlochSphere called:`, {offsetX, offsetY, width, height, title});
        
        const centerX = offsetX + width / 2;
        const centerY = offsetY + height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        console.log(`Sphere center: (${centerX}, ${centerY}), radius: ${radius}`);
        
        // Draw sphere outline
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        console.log('Drew sphere outline');
        
        // Draw coordinate axes
        this.ctx.strokeStyle = this.colors.text;
        this.ctx.lineWidth = 0.5;
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - radius, centerY);
        this.ctx.lineTo(centerX + radius, centerY);
        this.ctx.stroke();
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - radius);
        this.ctx.lineTo(centerX, centerY + radius);
        this.ctx.stroke();
        
        // Z-axis (elliptical)
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radius * 0.3, radius, 0, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        console.log('Drew coordinate axes');
        
        // Draw state vector on Bloch sphere
        if (stateVector.length === 2) {
            console.log('StateVector for Bloch sphere:', stateVector);
            
            // Get amplitude objects and check their properties
            const amp0 = stateVector[0].amplitude;
            const amp1 = stateVector[1].amplitude;
            
            console.log('Amplitude 0:', amp0, 'real:', amp0.real, 'imag:', amp0.imag);
            console.log('Amplitude 1:', amp1, 'real:', amp1.real, 'imag:', amp1.imag);
            
            // Calculate magnitude manually to avoid NaN issues
            const mag0 = Math.sqrt(amp0.real * amp0.real + amp0.imag * amp0.imag);
            const mag1 = Math.sqrt(amp1.real * amp1.real + amp1.imag * amp1.imag);
            
            console.log('Manual magnitude 0:', mag0, 'Manual magnitude 1:', mag1);
            console.log('Probability 0:', stateVector[0].probability, 'Probability 1:', stateVector[1].probability);
            
            const theta = 2 * Math.acos(Math.sqrt(stateVector[0].probability));
            
            // Calculate phi manually
            let phi = 0;
            if (mag0 > 0 && mag1 > 0) {
                const phase0 = Math.atan2(amp0.imag, amp0.real);
                const phase1 = Math.atan2(amp1.imag, amp1.real);
                phi = phase1 - phase0;
            }
            
            console.log(`Calculated: theta=${theta}, phi=${phi}`);
            
            // Handle NaN values
            if (isNaN(phi) || !isFinite(phi)) {
                console.log('Phi is invalid, defaulting to 0');
                phi = 0;
            }
            
            const x = centerX + radius * Math.sin(theta) * Math.cos(phi);
            const y = centerY - radius * Math.sin(theta) * Math.sin(phi);
            
            console.log(`Final coordinates: x=${x}, y=${y}`);
            
            // Draw state vector
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Draw state point
            this.ctx.fillStyle = this.colors.danger;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            console.log('Drew state vector and point');
        }
        
        // Draw labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('|0⟩', centerX, centerY - radius - 5);
        this.ctx.fillText('|1⟩', centerX, centerY + radius + 15);
        this.ctx.fillText('|+⟩', centerX + radius + 10, centerY);
        this.ctx.fillText('|-⟩', centerX - radius - 10, centerY);
        
        // Title
        this.ctx.font = '12px Arial';
        this.ctx.fillText(title, centerX, offsetY + 15);
        
        console.log('Drew labels and title');
    }
    
    getPhaseDifference(stateVector) {
        if (stateVector.length !== 2) return 0;
        
        // Handle both raw Complex objects and objects with .amplitude property
        const amp0 = stateVector[0].amplitude || stateVector[0];
        const amp1 = stateVector[1].amplitude || stateVector[1];
        
        // Only calculate phase difference if both amplitudes have non-zero magnitude
        if (amp0.magnitude() === 0 || amp1.magnitude() === 0) {
            return 0; // Default phase for zero amplitudes
        }
        
        const phase0 = amp0.phase();
        const phase1 = amp1.phase();
        
        return phase1 - phase0;
    }
    
    // Probability Distribution Visualization
    drawProbabilityDistribution(stateVector) {
        if (!this.ctx) return;
        
        this.clear();
        
        const padding = 40;
        const width = this.canvas.width - 2 * padding;
        const height = this.canvas.height - 2 * padding;
        
        // Draw axes
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.canvas.height - padding);
        this.ctx.lineTo(this.canvas.width - padding, this.canvas.height - padding);
        this.ctx.stroke();
        
        // Draw probability bars
        const barWidth = width / stateVector.length;
        
        stateVector.forEach((state, i) => {
            const x = padding + i * barWidth;
            const barHeight = state.probability * height;
            const y = this.canvas.height - padding - barHeight;
            
            // Color based on probability
            const intensity = Math.floor(state.probability * 255);
            this.ctx.fillStyle = `rgb(${intensity}, ${100}, ${255 - intensity})`;
            this.ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);
            
            // Draw probability text
            if (state.probability > 0.05) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(state.probability.toFixed(2), x + barWidth / 2, y + 15);
            }
            
            // Draw basis state label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.fillText(state.bitString, x + barWidth / 2, this.canvas.height - padding + 15);
        });
        
        // Title
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Measurement Probabilities', this.canvas.width / 2, 20);
    }
    
    // Circuit Visualization
    drawCircuit(circuit) {
        if (!this.ctx) return;
        
        this.clear();
        
        const padding = 40;
        const width = this.canvas.width - 2 * padding;
        const height = this.canvas.height - 2 * padding;
        const qubitHeight = height / circuit.numQubits;
        
        // Draw qubit lines
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < circuit.numQubits; i++) {
            const y = padding + i * qubitHeight + qubitHeight / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(this.canvas.width - padding, y);
            this.ctx.stroke();
        }
        
        // Draw qubit labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'right';
        
        for (let i = 0; i < circuit.numQubits; i++) {
            const y = padding + i * qubitHeight + qubitHeight / 2;
            this.ctx.fillText(`q${i}`, padding - 10, y + 4);
        }
        
        // Draw gates
        const gateWidth = 40;
        const gateSpacing = 60;
        let xPosition = padding + 20;
        
        (circuit.gates || []).forEach((gate, gateIndex) => {
            // Draw gate box
            this.ctx.fillStyle = this.colors.primary;
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 2;
            
            // Handle both quantum gates (targetQubits) and classical gates (inputQubits)
            const gateQubitsList = gate.targetQubits || gate.inputQubits || [];
            gateQubitsList.forEach(qubit => {
                const y = padding + qubit * qubitHeight + qubitHeight / 2;
                
                // Draw gate rectangle
                this.ctx.fillRect(xPosition - gateWidth / 2, y - 15, gateWidth, 30);
                
                // Draw gate symbol
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(gate.name, xPosition, y + 5);
                this.ctx.fillStyle = this.colors.primary;
            });
            
            // Draw connections for multi-qubit gates
            const gateQubits = gate.targetQubits || gate.inputQubits || [];
            if (gateQubits.length > 1) {
                const firstY = padding + gateQubits[0] * qubitHeight + qubitHeight / 2;
                const lastY = padding + gateQubits[gateQubits.length - 1] * qubitHeight + qubitHeight / 2;
                
                this.ctx.strokeStyle = this.colors.primary;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(xPosition, firstY);
                this.ctx.lineTo(xPosition, lastY);
                this.ctx.stroke();
                
                // Draw control dots for CNOT
                if (gate.name === 'CNOT') {
                    const controlY = padding + gate.targetQubits[0] * qubitHeight + qubitHeight / 2;
                    const targetY = padding + gate.targetQubits[1] * qubitHeight + qubitHeight / 2;
                    
                    // Control dot
                    this.ctx.fillStyle = this.colors.primary;
                    this.ctx.beginPath();
                    this.ctx.arc(xPosition, controlY, 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // Target circle
                    this.ctx.strokeStyle = this.colors.primary;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(xPosition, targetY, 8, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }
            }
            
            xPosition += gateSpacing;
        });
        
        // Title
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quantum Circuit', this.canvas.width / 2, 25);
    }
    
    // Performance Chart
    drawPerformanceChart(benchmarkData) {
        if (!this.ctx) return;
        
        this.clear();
        
        const padding = 40;
        const width = this.canvas.width - 2 * padding;
        const height = this.canvas.height - 2 * padding;
        
        // Draw axes
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.canvas.height - padding);
        this.ctx.lineTo(this.canvas.width - padding, this.canvas.height - padding);
        this.ctx.stroke();
        
        // Draw data based on benchmark type
        if (benchmarkData.gateOperations) {
            this.drawBarChart(benchmarkData.gateOperations, padding, width, height);
        } else if (benchmarkData.stateVectorSize) {
            this.drawLineChart(benchmarkData.stateVectorSize, padding, width, height);
        } else {
            this.drawGenericChart(benchmarkData, padding, width, height);
        }
        
        // Title
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Performance Benchmark', this.canvas.width / 2, 20);
    }
    
    drawBarChart(data, padding, width, height) {
        const keys = Object.keys(data);
        const barWidth = width / keys.length * 0.8;
        const maxValue = Math.max(...Object.values(data));
        
        keys.forEach((key, i) => {
            const x = padding + (i + 0.5) * (width / keys.length) - barWidth / 2;
            const barHeight = (data[key] / maxValue) * height;
            const y = this.canvas.height - padding - barHeight;
            
            this.ctx.fillStyle = this.colors.primary;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Labels
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(key, x + barWidth / 2, this.canvas.height - padding + 15);
            this.ctx.fillText(data[key].toFixed(2) + 'ms', x + barWidth / 2, y - 5);
        });
    }
    
    drawLineChart(data, padding, width, height) {
        const keys = Object.keys(data).map(k => parseInt(k)).sort((a, b) => a - b);
        const maxValue = Math.max(...keys.map(k => data[k].time));
        
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        keys.forEach((key, i) => {
            const x = padding + (i / (keys.length - 1)) * width;
            const y = this.canvas.height - padding - (data[key].time / maxValue) * height;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            // Draw point
            this.ctx.fillStyle = this.colors.danger;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Labels
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(key, x, this.canvas.height - padding + 15);
            this.ctx.fillText(data[key].time.toFixed(2) + 'ms', x, y - 10);
        });
        
        this.ctx.stroke();
    }
    
    drawGenericChart(data, padding, width, height) {
        // Generic chart for unknown data format
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Data visualization not available for this format', this.canvas.width / 2, this.canvas.height / 2);
    }
}

// Animation Controller
class AnimationController {
    constructor() {
        this.animations = [];
        this.isRunning = false;
    }
    
    addAnimation(animation) {
        this.animations.push(animation);
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.animations.forEach(animation => {
            if (animation.update()) {
                animation.draw();
            } else {
                // Remove completed animations
                const index = this.animations.indexOf(animation);
                if (index > -1) {
                    this.animations.splice(index, 1);
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Quantum State Animation
class QuantumStateAnimation {
    constructor(visualizer, initialState, finalState, duration = 1000) {
        this.visualizer = visualizer;
        this.initialState = initialState;
        this.finalState = finalState;
        this.duration = duration;
        this.startTime = null;
        this.currentState = initialState.clone();
    }
    
    update() {
        if (!this.startTime) {
            this.startTime = performance.now();
        }
        
        const elapsed = performance.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        
        // Interpolate between states
        this.interpolateStates(progress);
        
        return progress < 1;
    }
    
    interpolateStates(progress) {
        // Simple linear interpolation of amplitudes
        for (let i = 0; i < this.currentState.amplitudes.length; i++) {
            const initialAmp = this.initialState.amplitudes[i];
            const finalAmp = this.finalState.amplitudes[i];
            
            this.currentState.amplitudes[i] = new Complex(
                initialAmp.real + (finalAmp.real - initialAmp.real) * progress,
                initialAmp.imag + (finalAmp.imag - initialAmp.imag) * progress
            );
        }
        
        // Normalize
        this.currentState.normalize();
    }
    
    draw() {
        const stateVector = this.currentState.amplitudes.map((amp, i) => ({
            index: i,
            bitString: i.toString(2).padStart(this.currentState.numQubits, '0'),
            amplitude: amp,
            probability: amp.magnitude() ** 2
        }));
        
        this.visualizer.drawStateVector(stateVector);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QuantumVisualizer,
        AnimationController,
        QuantumStateAnimation
    };
}
