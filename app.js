/**
 * QuantumLab Main Application
 * Orchestrates the entire quantum computing simulator
 */

class QuantumLab {
    constructor() {
        this.circuit = null;
        this.visualizer = new QuantumVisualizer();
        this.animationController = new AnimationController();
        this.numQubits = 2;
        this.circuitBuilder = new CircuitBuilder();
        this.draggedGate = null;
        this.gateSlots = [];
        
        this.initializeEventListeners();
        this.initializeVisualization();
        this.createInitialCircuit();
    }
    
    initializeEventListeners() {
        // Circuit controls
        document.getElementById('add-qubit').addEventListener('click', () => this.addQubit());
        document.getElementById('clear-circuit').addEventListener('click', () => this.clearCircuit());
        document.getElementById('run-circuit').addEventListener('click', () => this.runCircuit());
        
        // Algorithm examples
        this.setupAlgorithmExamples();
        
        // Benchmarking
        document.getElementById('run-benchmark').addEventListener('click', () => this.runBenchmarks());
        
        // Tab switching
        this.setupTabSwitching();
        
        // Gate drag and drop (initialize after circuit is ready)
        this.setupDragAndDrop();
    }
    
    initializeVisualization() {
        // Initialize all visualization canvases
        this.visualizer.initializeCanvas('state-vector-canvas');
        this.visualizer.initializeCanvas('bloch-sphere-canvas');
        this.visualizer.initializeCanvas('probabilities-canvas');
        this.visualizer.initializeCanvas('benchmark-chart');
        
        // Start animation controller
        this.animationController.start();
    }
    
    createInitialCircuit() {
        this.circuit = this.circuitBuilder.createCircuit(this.numQubits);
        
        // Ensure the circuit has a state initialized
        if (!this.circuit.state) {
            this.circuit.state = new QuantumState(this.numQubits);
        }
        
        this.updateCircuitDisplay();
        this.updateVisualization();
        
        // Display initial state in correct notation
        const stateDisplay = document.getElementById('state-display');
        const initialState = '|0⟩'.repeat(this.numQubits);
        stateDisplay.textContent = `|ψ⟩ = ${initialState}`;
    }
    
    setupDragAndDrop() {
        // Setup input state controls
        this.setupInputStateControls();
        
        // Setup gate dragging
        document.querySelectorAll('.gate').forEach(gate => {
            gate.addEventListener('dragstart', (e) => {
                this.draggedGate = {
                    name: gate.dataset.gate,
                    element: gate
                };
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
        
        // Setup circuit workspace
        const workspace = document.getElementById('circuit-workspace');
        workspace.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        workspace.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedGate) {
                this.handleGateDrop(e);
            }
        });
    }
    
    setupInputStateControls() {
        // Add input state controls to the dedicated input state panel
        const inputStatePanel = document.getElementById('input-state-form');
        
        if (inputStatePanel) {
            // Generate qubit inputs dynamically based on current number of qubits
            let qubitInputsHTML = '';
            for (let i = 0; i < this.numQubits; i++) {
                qubitInputsHTML += `
                    <div class="qubit-input" data-qubit="${i}">
                        <div class="basis-controls">
                            <div class="basis-state">
                                <label for="qubit-${i}-0">Qubit ${i} |0⟩ amplitude:</label>
                                <input type="text" id="qubit-${i}-0" name="qubit-${i}-0" class="complex-input" data-qubit="${i}" data-basis="0" value="1" placeholder="a+bi">
                            </div>
                            <div class="basis-state">
                                <label for="qubit-${i}-1">Qubit ${i} |1⟩ amplitude:</label>
                                <input type="text" id="qubit-${i}-1" name="qubit-${i}-1" class="complex-input" data-qubit="${i}" data-basis="1" value="0" placeholder="a+bi">
                            </div>
                        </div>
                        <div class="preset-states">
                            <button class="preset-btn" data-qubit="${i}" data-state="|0⟩">|0⟩</button>
                            <button class="preset-btn" data-qubit="${i}" data-state="|1⟩">|1⟩</button>
                            <button class="preset-btn" data-qubit="${i}" data-state="|+⟩">|+⟩</button>
                            <button class="preset-btn" data-qubit="${i}" data-state="|-⟩">|-⟩</button>
                        </div>
                    </div>
                `;
            }
            
            inputStatePanel.innerHTML = `
                <div class="qubit-inputs">
                    ${qubitInputsHTML}
                </div>
                <div class="input-actions">
                    <button id="set-input-state" class="btn btn-primary">Set Input State</button>
                    <button id="reset-input-state" class="btn btn-secondary">Reset to |00⟩</button>
                    <button id="random-input-state" class="btn btn-outline">Random State</button>
                </div>
                <div class="normalization-info">
                    <small>States are automatically normalized</small>
                </div>
            `;
        }
        
        // Add event listeners
        document.getElementById('set-input-state').addEventListener('click', () => this.setInputState());
        document.getElementById('reset-input-state').addEventListener('click', () => this.resetInputState());
        document.getElementById('random-input-state').addEventListener('click', () => this.setRandomInputState());
        
        // Add complex number input validation
        this.setupComplexInputValidation();
    }
    
    setupComplexInputValidation() {
        document.querySelectorAll('.complex-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.validateComplexInput(e.target);
            });
        });
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setPresetState(e.target.dataset.qubit, e.target.dataset.state);
            });
        });
    }
    
    validateComplexInput(input) {
        const value = input.value.trim();
        if (value === '') return;
        
        // Parse complex number formats: "a+bi", "a-bi", "bi", "a", "i"
        const complexRegex = /^([+-]?\d*\.?\d*)([+-]\d*\.?\d*)?i?$/;
        const match = value.match(complexRegex);
        
        if (!match) {
            input.style.borderColor = '#ef4444';
            return false;
        }
        
        input.style.borderColor = '#10b981';
        return true;
    }
    
    parseComplex(value) {
        if (value === '' || value === '0') return new Complex(0, 0);
        if (value === '1') return new Complex(1, 0);
        if (value === 'i') return new Complex(0, 1);
        if (value === '-i') return new Complex(0, -1);
        
        const complexRegex = /^([+-]?\d*\.?\d*)([+-]\d*\.?\d*)i$/;
        const match = value.match(complexRegex);
        
        if (match) {
            const real = parseFloat(match[1]) || 0;
            const imag = parseFloat(match[2]) || 0;
            return new Complex(real, imag);
        }
        
        // Handle pure real numbers
        const real = parseFloat(value);
        return new Complex(real, 0);
    }
    
    setInputState() {
        // Validate all inputs
        const inputs = document.querySelectorAll('.complex-input');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateComplexInput(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showError('Invalid complex numbers in input state');
            return;
        }
        
        // Create input state from user values
        const amplitudes = [];
        
        for (let i = 0; i < this.numQubits; i++) {
            const amp0 = this.parseComplex(document.querySelector(`[data-qubit="${i}"][data-basis="0"]`).value);
            const amp1 = this.parseComplex(document.querySelector(`[data-qubit="${i}"][data-basis="1"]`).value);
            
            // For multi-qubit states, we need to compute the tensor product
            if (i === 0) {
                amplitudes.push(amp0, amp1);
            } else {
                const newAmplitudes = [];
                for (let j = 0; j < amplitudes.length; j++) {
                    newAmplitudes.push(amplitudes[j].multiply(amp0));
                    newAmplitudes.push(amplitudes[j].multiply(amp1));
                }
                amplitudes.splice(0, amplitudes.length, ...newAmplitudes);
            }
        }
        
        // Check for zero state BEFORE normalization
        const norm = Math.sqrt(amplitudes.reduce((sum, amp) => sum + amp.magnitude() ** 2, 0));
        if (norm < 1e-10) {
            this.showError('Invalid input state: Zero vector has no physical meaning. All amplitudes cannot be zero.');
            return;
        }
        
        // Set the input state - update both the CircuitBuilder and the actual circuit
        const newState = QuantumState.fromAmplitudes(amplitudes);
        this.circuit.state = newState;
        // Also set the state on the actual circuit inside the CircuitBuilder
        if (this.circuit.circuit) {
            this.circuit.circuit.state = newState.clone();
        }
        this.updateStateDisplay();
        this.updateProbabilityDisplay();
        this.showNotification('Input state set successfully', 'success');
    }
    
    updateProbabilityDisplay() {
        const probabilityDisplay = document.getElementById('probability-display');
        if (this.circuit && this.circuit.state) {
            const amplitudes = this.circuit.state.amplitudes;
            console.log('updateProbabilityDisplay - amplitudes:', amplitudes.map(a => a.toString()));
            console.log('updateProbabilityDisplay - magnitudes:', amplitudes.map(a => a.magnitude()));
            
            let probHTML = '';
            amplitudes.forEach((amp, i) => {
                const prob = amp.magnitude() ** 2;
                console.log(`State |${i.toString(2).padStart(this.numQubits, '0')}⟩: amplitude=${amp.toString()}, magnitude=${amp.magnitude()}, probability=${prob}`);
                if (prob > 0.000001) { // Even lower threshold to show very small probabilities
                    const bitString = i.toString(2).padStart(this.numQubits, '0');
                    probHTML += `<div>|${bitString}⟩: ${(prob * 100).toFixed(2)}% (amplitude: ${amp.real.toFixed(3)}${amp.imag >= 0 ? '+' : ''}${amp.imag.toFixed(3)}i)</div>`;
                }
            });
            
            // Fallback if no probabilities shown
            if (probHTML === '') {
                probHTML = '<div>No significant probabilities found</div>';
            }
            
            console.log('Final probHTML:', probHTML);
            probabilityDisplay.innerHTML = probHTML;
        }
    }
    
    setPresetState(qubitIndex, state) {
        const amp0Input = document.querySelector(`[data-qubit="${qubitIndex}"][data-basis="0"]`);
        const amp1Input = document.querySelector(`[data-qubit="${qubitIndex}"][data-basis="1"]`);
        
        if (!amp0Input || !amp1Input) {
            console.error(`Inputs for qubit ${qubitIndex} not found`);
            return;
        }
        
        switch (state) {
            case '|0⟩':
                amp0Input.value = '1';
                amp1Input.value = '0';
                break;
            case '|1⟩':
                amp0Input.value = '0';
                amp1Input.value = '1';
                break;
            case '|+⟩':
                amp0Input.value = '0.7071';
                amp1Input.value = '0.7071';
                break;
            case '|-⟩':
                amp0Input.value = '0.7071';
                amp1Input.value = '-0.7071';
                break;
        }
        
        // Trigger validation
        this.validateComplexInput(amp0Input);
        this.validateComplexInput(amp1Input);
    }
    
    resetInputState() {
        for (let i = 0; i < this.numQubits; i++) {
            this.setPresetState(i, '|0⟩');
        }
        this.setInputState();
    }
    
    setRandomInputState() {
        for (let i = 0; i < this.numQubits; i++) {
            const inputs = document.querySelectorAll(`[data-qubit="${i}"]`);
            // Generate random normalized amplitudes
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.random() * Math.PI;
            
            inputs[0].value = `${Math.cos(theta/2).toFixed(3)}`;
            inputs[1].value = `${Math.sin(theta/2) * Math.cos(phi).toFixed(3)}${Math.sin(theta/2) * Math.sin(phi) >= 0 ? '+' : ''}${Math.sin(theta/2) * Math.sin(phi).toFixed(3)}i`;
            
            inputs.forEach(input => this.validateComplexInput(input));
        }
        this.setInputState();
    }
    
    updateStateDisplay() {
        const stateDisplay = document.getElementById('state-display');
        if (this.circuit && this.circuit.state) {
            stateDisplay.textContent = this.circuit.state.toString();
        }
    }
    
    handleGateDrop(event) {
        const workspace = document.getElementById('circuit-workspace');
        const rect = workspace.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Find which qubit line was dropped on
        const qubitHeight = 60;
        const qubitIndex = Math.floor(y / qubitHeight);
        
        if (qubitIndex >= 0 && qubitIndex < this.numQubits) {
            // Find the qubit line element
            const qubitLine = workspace.querySelector(`[data-qubit="${qubitIndex}"]`);
            if (!qubitLine) return;
            
            // Find the wire element (where slots are)
            const wire = qubitLine.querySelector('.qubit-wire');
            if (!wire) return;
            
            // Get wire position relative to workspace
            const wireRect = wire.getBoundingClientRect();
            const workspaceRect = workspace.getBoundingClientRect();
            const wireX = wireRect.left - workspaceRect.left;
            
            // Calculate position relative to wire
            const relativeX = x - wireX;
            const slotWidth = 60; // Width of each slot
            const position = Math.floor(relativeX / slotWidth);
            
            console.log(`Drop: x=${x}, wireX=${wireX}, relativeX=${relativeX}, position=${position}`);
            
            // Check if this is a multi-qubit gate
            const multiQubitGates = ['CNOT', 'CZ', 'SWAP'];
            
            if (multiQubitGates.includes(this.draggedGate.name)) {
                // For multi-qubit gates, we need at least 2 qubits
                if (this.numQubits >= 2) {
                    // Determine target qubits based on drop position
                    let targetQubits;
                    if (this.draggedGate.name === 'SWAP') {
                        // SWAP can work between any two adjacent qubits
                        if (qubitIndex < this.numQubits - 1) {
                            targetQubits = [qubitIndex, qubitIndex + 1];
                        } else {
                            targetQubits = [qubitIndex - 1, qubitIndex];
                        }
                    } else {
                        // CNOT and CZ - control on dropped qubit, target on next qubit
                        if (qubitIndex < this.numQubits - 1) {
                            targetQubits = [qubitIndex, qubitIndex + 1]; // Control on qubitIndex, target on qubitIndex+1
                        } else {
                            targetQubits = [qubitIndex - 1, qubitIndex]; // Control on qubitIndex-1, target on qubitIndex
                        }
                    }
                    console.log(`Adding multi-qubit gate ${this.draggedGate.name} at position ${position} to qubits ${targetQubits}`);
                    this.addGateToCircuit(this.draggedGate.name, targetQubits, { position });
                } else {
                    this.showError('Multi-qubit gates require at least 2 qubits');
                }
            } else {
                // Single qubit gate
                console.log(`Adding single-qubit gate ${this.draggedGate.name} to qubit ${qubitIndex} at position ${position}`);
                this.addGateToCircuit(this.draggedGate.name, [qubitIndex], { position });
            }
        }
        
        this.draggedGate = null;
    }
    
    addGateToCircuit(gateName, targetQubits, params = {}) {
        try {
            console.log(`Adding gate: ${gateName} to qubits ${targetQubits} with params:`, params);
            
            // Ensure circuit exists
            if (!this.circuit) {
                this.createInitialCircuit();
            }
            
            // Check if gate requires parameters
            const gateInfo = QuantumGates.getGateInfo(gateName);
            console.log(`Gate info for ${gateName}:`, gateInfo);
            
            if (gateInfo && gateInfo.params > 0) {
                console.log(`Gate ${gateName} requires parameters, showing dialog`);
                this.showParameterDialog(gateName, targetQubits, params.position || 0);
            } else {
                console.log(`Adding gate ${gateName} directly to circuit`);
                this.circuitBuilder.addGate(gateName, targetQubits, params);
                this.circuit = this.circuitBuilder.circuit; // Get the updated circuit
                console.log(`Added gate ${gateName} to qubits [${targetQubits.join(', ')}]`);
                console.log('Circuit now has', (this.circuit.gates || []).length, 'gates');
                this.updateCircuitDisplay();
                this.updateVisualization();
            }
        } catch (error) {
            console.error(`Error adding gate ${gateName}:`, error);
            this.showError(`Failed to add gate ${gateName}: ${error.message}`);
            this.showError(error.message);
        }
    }
    
    showParameterDialog(gateName, targetQubits, position = 0) {
        console.log(`Showing parameter dialog for ${gateName} at position ${position}`);
        const dialog = document.createElement('div');
        dialog.className = 'parameter-dialog';
        dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        dialog.innerHTML = `
            <div class="dialog-content" style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); max-width: 400px; width: 100%; margin: 0 1rem;">
                <h3 style="color: #6366f1; margin-bottom: 1.5rem; font-size: 1.3rem;">Gate Parameters: ${gateName}</h3>
                <div class="parameter-form"></div>
                <div class="dialog-buttons" style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end;">
                    <button class="btn btn-primary">Apply</button>
                    <button class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        console.log('Dialog added to body');
        console.log('Dialog element:', dialog);
        console.log('Dialog offset:', dialog.getBoundingClientRect());
        
        // Create parameter form
        const form = GateParameterDialog.createParameterForm(gateName);
        console.log('Parameter form created:', form);
        if (form) {
            dialog.querySelector('.parameter-form').appendChild(form);
        }
        
        // Handle dialog actions
        dialog.querySelector('.btn-primary').addEventListener('click', () => {
            console.log('Apply button clicked');
            const params = form ? GateParameterDialog.getParameterValues(gateName, form) : {};
            console.log('Parameters collected:', params);
            
            // Add the position parameter to the params
            params.position = position;
            
            console.log('Final params with position:', params);
            console.log('Adding gate to circuit:', gateName, targetQubits, params);
            
            // Use circuit builder instead of direct circuit.addGate
            this.circuitBuilder.addGate(gateName, targetQubits, params);
            this.circuit = this.circuitBuilder.circuit; // Get the updated circuit
            console.log('Gate added to circuit via builder');
            console.log('Circuit now has', (this.circuit.gates || []).length, 'gates');
            
            this.updateCircuitDisplay();
            this.updateVisualization();
            document.body.removeChild(dialog);
        });
        
        dialog.querySelector('.btn-secondary').addEventListener('click', () => {
            console.log('Cancel button clicked');
            document.body.removeChild(dialog);
        });
    }
    
    updateCircuitDisplay() {
        console.log('Updating circuit display');
        const workspace = document.getElementById('circuit-workspace');
        if (!workspace) {
            console.error('Circuit workspace not found');
            return;
        }
        workspace.innerHTML = '';
        console.log('Workspace cleared, numQubits:', this.numQubits);
        
        // Create qubit lines
        for (let i = 0; i < this.numQubits; i++) {
            console.log(`Creating qubit line ${i}`);
            const qubitLine = document.createElement('div');
            qubitLine.className = 'qubit-line';
            qubitLine.dataset.qubit = i;
            qubitLine.style.display = 'flex';
            qubitLine.style.alignItems = 'center';
            qubitLine.style.marginBottom = '1rem';
            qubitLine.style.minHeight = '60px';
            qubitLine.style.position = 'relative';
            qubitLine.style.border = '1px solid #e5e7eb';
            qubitLine.style.padding = '0.5rem';
            qubitLine.style.borderRadius = '4px';
            
                        
            const label = document.createElement('div');
            label.className = 'qubit-label';
            label.innerHTML = `q${i}`;
            label.style.color = '#6b7280';
            label.style.fontWeight = 'bold';
            
            const wire = document.createElement('div');
            wire.className = 'qubit-wire';
            wire.style.flex = '1';
            wire.style.height = '2px';
            wire.style.background = '#e5e7eb';
            wire.style.position = 'relative';
            wire.style.display = 'flex';
            wire.style.alignItems = 'center';
            wire.style.padding = '0 1rem';
            
            // Add gate slots - calculate based on actual gate positions
            const allPositions = new Set();
            (this.circuit.gates || []).forEach(gate => {
                const position = gate.params.position || 0;
                if (gate.targetQubits.includes(i)) {
                    allPositions.add(position);
                    console.log(`Gate ${gate.name} on qubit ${i} at position ${position}`);
                }
            });
            
            // Ensure minimum 5 slots
            const maxPosition = Math.max(...Array.from(allPositions), 4);
            console.log(`Qubit ${i}: positions=${Array.from(allPositions)}, maxPosition=${maxPosition}`);
            
            for (let j = 0; j <= maxPosition; j++) {
                const slot = document.createElement('div');
                slot.className = 'gate-slot';
                slot.dataset.qubit = i;
                slot.dataset.position = j;
                slot.style.width = '50px';
                slot.style.height = '50px';
                slot.style.border = '2px solid #e5e7eb';
                slot.style.borderRadius = '6px';
                slot.style.background = 'white';
                slot.style.display = 'flex';
                slot.style.alignItems = 'center';
                slot.style.justifyContent = 'center';
                slot.style.margin = '0 0.5rem';
                slot.style.cursor = 'pointer';
                slot.style.transition = 'all 0.3s ease';
                
                // Check if there's a gate at this position
                const gate = this.getGateAtPosition(i, j);
                if (gate) {
                    slot.classList.add('occupied');
                    slot.textContent = gate.name;
                    slot.dataset.gateName = gate.name;
                    slot.style.background = '#6366f1';
                    slot.style.color = 'white';
                    slot.style.fontWeight = 'bold';
                    slot.style.fontSize = '12px';
                    slot.style.border = '2px solid #6366f1';
                } else {
                    // Make empty slots more visible and show Identity gate
                    slot.style.background = '#f9fafb';
                    slot.style.border = '2px dashed #d1d5db';
                    slot.textContent = 'I';
                    slot.style.color = '#9ca3af';
                    slot.style.fontWeight = 'bold';
                    slot.style.fontSize = '12px';
                }
                
                wire.appendChild(slot);
            }
            
            qubitLine.appendChild(label);
            qubitLine.appendChild(wire);
            workspace.appendChild(qubitLine);
            console.log(`Added qubit line ${i} to workspace`);
        }
        
        console.log('Finished creating all qubit lines');
        
        // Add click handlers to gate slots
        workspace.querySelectorAll('.gate-slot').forEach(slot => {
            slot.addEventListener('click', () => this.handleSlotClick(slot));
        });
    }
    
    getGateAtPosition(qubit, position) {
        // Find gate at specific position for this qubit
        const gate = (this.circuit.gates || []).find(gate => {
            const gatePosition = gate.params.position || gate.targetQubits.indexOf(qubit);
            return gate.targetQubits.includes(qubit) && gatePosition === position;
        });
        console.log(`getGateAtPosition: qubit=${qubit}, position=${position}, found=${gate ? gate.name : 'null'}`);
        return gate || null;
    }
    
    handleSlotClick(slot) {
        if (slot.classList.contains('occupied')) {
            // Remove gate
            const gateName = slot.dataset.gateName;
            this.removeGateFromSlot(slot);
        } else {
            // Could show gate selection dialog here
            console.log('Empty slot clicked:', slot.dataset.qubit, slot.dataset.position);
        }
    }
    
    removeGateFromSlot(slot) {
        const qubit = parseInt(slot.dataset.qubit);
        const position = parseInt(slot.dataset.position);
        
        // Find and remove the gate
        const qubitGates = this.circuit.gates.filter(g => g.targetQubits.includes(qubit));
        const gateToRemove = qubitGates[position];
        
        if (gateToRemove) {
            const index = this.circuit.gates.indexOf(gateToRemove);
            this.circuit.gates.splice(index, 1);
            this.updateCircuitDisplay();
            this.updateVisualization();
        }
    }
    
    addQubit() {
        if (this.numQubits >= 8) {
            this.showError('Maximum 8 qubits supported');
            return;
        }
        
        this.numQubits++;
        this.circuit = this.circuitBuilder.createCircuit(this.numQubits);
        this.updateCircuitDisplay();
        this.updateVisualization();
        this.setupInputStateControls(); // Regenerate input state controls for new qubit
    }
    
    clearCircuit() {
        console.log('Clear circuit called');
        try {
            this.circuitBuilder.reset();
            this.circuit = this.circuitBuilder.createCircuit(this.numQubits);
            console.log('Circuit cleared:', this.circuit);
            this.updateCircuitDisplay();
            this.updateVisualization();
        } catch (error) {
            console.error('Error clearing circuit:', error);
            this.showError('Failed to clear circuit: ' + error.message);
        }
    }
    
    runCircuit() {
        console.log('Run circuit called');
        try {
            if (!this.circuit) {
                throw new Error('No circuit exists');
            }
            
            // Check if circuit state exists using try block
            try {
                if (!this.circuit.state) {
                    this.showError('Circuit state not initialized. Please set an input state first.');
                    return;
                }
            } catch (stateError) {
                this.showError('Circuit state not initialized. Please set an input state first.');
                return;
            }
            
            // Check for zero state - if all amplitudes are zero, it's meaningless
            try {
                const norm = Math.sqrt(this.circuit.state.amplitudes.reduce((sum, amp) => sum + amp.magnitude() ** 2, 0));
                if (norm < 1e-10) {
                    this.showError('Invalid input state: Zero vector has no physical meaning. All amplitudes cannot be zero.');
                    return;
                }
            } catch (normError) {
                this.showError('Invalid input state: Cannot compute norm. Please set a valid input state.');
                return;
            }
            
            console.log('Running circuit:', this.circuit);
            console.log('Input state before execution:', this.circuit.state.toString());
            console.log('Input state amplitudes:', this.circuit.state.amplitudes.map(a => a.toString()));
            
            const result = this.circuit.run();
            console.log('Circuit result:', result);
            console.log('Output state after execution:', result.finalState.toString());
            console.log('Output state amplitudes:', result.finalState.amplitudes.map(a => a.toString()));
            this.displayResults(result);
            
            // Animate state evolution
            this.animateStateEvolution(result);
        } catch (error) {
            console.error('Error running circuit:', error);
            this.showError('Error running circuit: ' + error.message);
        }
    }
    
    displayZeroStateError() {
        // Show placeholder instead of results
        const stateDisplay = document.getElementById('state-display');
        stateDisplay.textContent = '|ψ⟩ = Invalid State (Zero Vector)';
        
        const probabilityDisplay = document.getElementById('probability-display');
        probabilityDisplay.innerHTML = '<div style="color: #ef4444;">Error: Input state is undefined (all amplitudes are zero)</div>';
        
        // Clear visualizations
        this.visualizer.clearCanvas('state-vector-canvas');
        this.visualizer.clearCanvas('bloch-sphere-canvas');
        this.visualizer.clearCanvas('probabilities-canvas');
    }
    
    displayResults(result) {
        console.log('=== DISPLAY RESULTS START ===');
        console.log('Displaying results:', result);
        console.log('Final state type:', typeof result.finalState);
        console.log('Final state has getStateVector:', typeof result.finalState.getStateVector);
        
        // Update state display with final state
        const stateDisplay = document.getElementById('state-display');
        if (result.finalState) {
            stateDisplay.textContent = result.finalState.toString();
            console.log('Final state:', result.finalState.toString());
        }
        
        // Update probability display with final state probabilities
        const probabilityDisplay = document.getElementById('probability-display');
        if (result.finalState) {
            const amplitudes = result.finalState.amplitudes;
            console.log('Probability calculation - amplitudes:', amplitudes.map(a => a.toString()));
            console.log('Probability calculation - magnitudes:', amplitudes.map(a => a.magnitude()));
            
            let probHTML = '';
            amplitudes.forEach((amp, i) => {
                const prob = amp.magnitude() ** 2;
                console.log(`State |${i.toString(2).padStart(this.numQubits, '0')}⟩: amplitude=${amp.toString()}, magnitude=${amp.magnitude()}, probability=${prob}`);
                if (prob > 0.000001) { // Even lower threshold to show very small probabilities
                    const bitString = i.toString(2).padStart(this.numQubits, '0');
                    probHTML += `<div>|${bitString}⟩: ${(prob * 100).toFixed(2)}% (amplitude: ${amp.real.toFixed(3)}${amp.imag >= 0 ? '+' : ''}${amp.imag.toFixed(3)}i)</div>`;
                }
            });
            
            // Fallback if no probabilities shown
            if (probHTML === '') {
                probHTML = '<div>No significant probabilities found</div>';
            }
            
            console.log('Final probHTML:', probHTML);
            console.log('Probability display element:', probabilityDisplay);
            probabilityDisplay.innerHTML = probHTML;
            console.log('After setting innerHTML');
        }
        
        // Update visualizations with final state
        if (result.finalState) {
            const stateVector = result.finalState.amplitudes;
            this.visualizer.drawStateVector(stateVector);
            this.visualizer.drawBlochSphere(stateVector);
            this.visualizer.drawProbabilityDistribution(stateVector);
        }
        
        // Show measurements if any
        if (result.measurements && result.measurements.length > 0) {
            const measurementResults = result.measurements.map(m => 
                `q${m.qubit} = ${m.result}`
            ).join(', ');
            
            this.showNotification(`Measurements: ${measurementResults}`, 'success');
        }
        
        this.showNotification('Circuit executed successfully!', 'success');
    }
    
    animateStateEvolution(result) {
        if (result.gateOperations && result.gateOperations.length > 0) {
            const initialState = result.initialState;
            const finalState = result.finalState;
            
            const animation = new QuantumStateAnimation(
                this.visualizer,
                initialState,
                finalState,
                2000 // 2 second animation
            );
            
            this.animationController.addAnimation(animation);
        }
    }
    
    updateVisualization() {
        if (!this.circuit) {
            return;
        }
        
        // Don't update visualization after adding gates - only after running circuit
        // This prevents errors when the circuit state isn't fully computed yet
        if (this.circuit.state && this.circuit.state.getStateVector) {
            const stateVector = this.circuit.state.getStateVector();
            
            // Update all visualizations
            this.visualizer.drawStateVector(stateVector);
            this.visualizer.drawBlochSphere(stateVector);
            this.visualizer.drawProbabilityDistribution(stateVector);
        }
        
        this.visualizer.drawCircuit(this.circuit);
    }
    
    setupAlgorithmExamples() {
        document.querySelectorAll('.algorithm-card').forEach(card => {
            const button = card.querySelector('button');
            button.addEventListener('click', () => {
                const algorithm = card.dataset.algorithm;
                this.loadAlgorithm(algorithm);
            });
        });
    }
    
    loadAlgorithm(algorithmName) {
        try {
            let circuit;
            
            switch (algorithmName) {
                case 'deutsch-jozsa':
                    circuit = QuantumAlgorithms.DeutschJozsa();
                    break;
                case 'grover':
                    circuit = QuantumAlgorithms.GroverSearch();
                    break;
                case 'quantum-fourier':
                    circuit = QuantumAlgorithms.QuantumFourierTransform(3);
                    break;
                case 'teleportation':
                    circuit = QuantumAlgorithms.QuantumTeleportation();
                    break;
                default:
                    throw new Error(`Unknown algorithm: ${algorithmName}`);
            }
            
            this.circuit = circuit;
            this.numQubits = circuit.numQubits;
            this.circuitBuilder.createCircuit(this.numQubits);
            this.circuitBuilder.circuit = circuit;
            
            this.updateCircuitDisplay();
            this.updateVisualization();
            
            this.showNotification(`Loaded ${algorithmName.replace('-', ' ')} algorithm`, 'success');
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    runBenchmarks() {
        try {
            const results = QuantumBenchmark.runBenchmarks();
            
            // Display benchmark results
            this.visualizer.drawPerformanceChart(results);
            
            // Show summary
            const summary = this.createBenchmarkSummary(results);
            this.showNotification(summary, 'info');
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    createBenchmarkSummary(results) {
        let summary = 'Benchmark Results:\n';
        
        if (results.gateOperations) {
            summary += '\nGate Operation Times:\n';
            Object.entries(results.gateOperations).forEach(([gate, time]) => {
                summary += `  ${gate}: ${time.toFixed(3)}ms\n`;
            });
        }
        
        if (results.stateVectorSize) {
            summary += '\nState Vector Performance:\n';
            Object.entries(results.stateVectorSize).forEach(([qubits, data]) => {
                summary += `  ${qubits} qubits: ${data.time.toFixed(3)}ms (${data.dimension} states)\n`;
            });
        }
        
        return summary;
    }
    
    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }
    
    switchTab(tabName) {
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update panel visibility
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabName);
        });
        
        // Refresh visualization for the active tab
        this.refreshActiveVisualization(tabName);
    }
    
    refreshActiveVisualization(tabName) {
        const stateVector = this.circuit.state.amplitudes;
        
        switch (tabName) {
            case 'state-vector':
                this.visualizer.drawStateVector(stateVector);
                break;
            case 'bloch-sphere':
                this.visualizer.drawBlochSphere(stateVector);
                break;
            case 'probabilities':
                this.visualizer.drawProbabilityDistribution(stateVector);
                break;
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6366f1'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
        console.error('QuantumLab Error:', message);
    }
    
    // Utility methods
    exportCircuit() {
        const circuitData = {
            numQubits: this.numQubits,
            gates: this.circuit.gates.map(g => ({
                name: g.name,
                targetQubits: g.targetQubits,
                params: g.params
            })),
            measurements: this.circuit.measurements
        };
        
        const dataStr = JSON.stringify(circuitData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'quantum-circuit.json';
        link.click();
    }
    
    importCircuit(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const circuitData = JSON.parse(e.target.result);
                
                this.numQubits = circuitData.numQubits;
                this.circuit = this.circuitBuilder.createCircuit(this.numQubits);
                
                circuitData.gates.forEach(gate => {
                    this.circuit.addGate(gate.name, gate.targetQubits, gate.params || {});
                });
                
                circuitData.measurements.forEach(meas => {
                    this.circuit.addMeasurement(meas.qubit);
                });
                
                this.updateCircuitDisplay();
                this.updateVisualization();
                
                this.showNotification('Circuit imported successfully', 'success');
            } catch (error) {
                this.showError('Failed to import circuit: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('QuantumLab: DOM loaded, initializing...');
    window.quantumLab = new QuantumLab();
    console.log('QuantumLab: Initialization complete');
// Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    document.getElementById('run-circuit').click();
                    break;
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    document.getElementById('clear-circuit').click();
                    break;
                case 's':
                    e.preventDefault();
                    window.quantumLab.exportCircuit();
                    break;
                case 'o':
                    e.preventDefault();
                    // Could trigger file import dialog
                    break;
            }
        }
    });
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        if (window.quantumLab) {
            window.quantumLab.updateVisualization();
        }
    });
    
    console.log('QuantumLab initialized successfully!');
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuantumLab;
}
