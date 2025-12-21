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
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        
        // Draw sphere outline
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw coordinate axes
        this.ctx.strokeStyle = this.colors.text;
        this.ctx.lineWidth = 1;
        
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
        
        // Draw state vector on Bloch sphere (for single qubit)
        if (stateVector.length === 2) {
            const theta = 2 * Math.acos(Math.sqrt(stateVector[0].probability));
            const phi = this.getPhaseDifference(stateVector);
            
            const x = centerX + radius * Math.sin(theta) * Math.cos(phi);
            const y = centerY - radius * Math.sin(theta) * Math.sin(phi);
            const z = centerY - radius * Math.cos(theta);
            
            // Draw state vector
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Draw state point
            this.ctx.fillStyle = this.colors.danger;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        // Draw labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('|0⟩', centerX, centerY - radius - 10);
        this.ctx.fillText('|1⟩', centerX, centerY + radius + 20);
        this.ctx.fillText('|+⟩', centerX + radius + 15, centerY);
        this.ctx.fillText('|-⟩', centerX - radius - 15, centerY);
        
        // Title
        this.ctx.fillText('Bloch Sphere', centerX, 20);
    }
    
    getPhaseDifference(stateVector) {
        if (stateVector.length !== 2) return 0;
        
        const phase0 = stateVector[0].amplitude.phase();
        const phase1 = stateVector[1].amplitude.phase();
        
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
            
            gate.targetQubits.forEach(qubit => {
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
            if (gate.targetQubits.length > 1) {
                const firstY = padding + gate.targetQubits[0] * qubitHeight + qubitHeight / 2;
                const lastY = padding + gate.targetQubits[gate.targetQubits.length - 1] * qubitHeight + qubitHeight / 2;
                
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
