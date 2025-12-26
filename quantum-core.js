/**
 * Quantum Computing Core Library
 * Provides fundamental quantum computing operations and data structures
 */

class Complex {
    constructor(real, imag = 0) {
        this.real = real;
        this.imag = imag;
    }

    static fromPolar(magnitude, angle) {
        return new Complex(
            magnitude * Math.cos(angle),
            magnitude * Math.sin(angle)
        );
    }

    add(other) {
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    subtract(other) {
        return new Complex(this.real - other.real, this.imag - other.imag);
    }

    multiply(other) {
        return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real
        );
    }

    divide(other) {
        const denominator = other.real * other.real + other.imag * other.imag;
        return new Complex(
            (this.real * other.real + this.imag * other.imag) / denominator,
            (this.imag * other.real - this.real * other.imag) / denominator
        );
    }

    magnitude() {
        return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }

    phase() {
        return Math.atan2(this.imag, this.real);
    }

    conjugate() {
        return new Complex(this.real, -this.imag);
    }

    clone() {
        return new Complex(this.real, this.imag);
    }

    toString() {
        if (Math.abs(this.imag) < 1e-10) {
            return this.real.toFixed(4);
        } else if (Math.abs(this.real) < 1e-10) {
            return `${this.imag.toFixed(4)}i`;
        } else if (this.imag >= 0) {
            return `(${this.real.toFixed(4)} + ${this.imag.toFixed(4)}i)`;
        } else {
            return `(${this.real.toFixed(4)} - ${Math.abs(this.imag).toFixed(4)}i)`;
        }
    }
}

class Matrix {
    constructor(rows, cols, data = null) {
        this.rows = rows;
        this.cols = cols;

        if (data) {
            this.data = data;
        } else {
            this.data = Array(rows).fill().map(() =>
                Array(cols).fill().map(() => new Complex(0, 0))
            );
        }
    }

    static identity(size) {
        const matrix = new Matrix(size, size);
        for (let i = 0; i < size; i++) {
            matrix.data[i][i] = new Complex(1, 0);
        }
        return matrix;
    }

    static zeros(rows, cols) {
        return new Matrix(rows, cols);
    }

    static fromArray(arr) {
        const rows = arr.length;
        const cols = arr[0].length;
        const data = arr.map(row =>
            row.map(val => {
                if (val instanceof Complex) return val;
                if (typeof val === 'number') return new Complex(val, 0);
                return new Complex(0, 0);
            })
        );
        return new Matrix(rows, cols, data);
    }

    get(row, col) {
        return this.data[row][col];
    }

    set(row, col, value) {
        this.data[row][col] = value;
    }

    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error("Matrix dimensions don't match for multiplication");
        }

        const result = new Matrix(this.rows, other.cols);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < other.cols; j++) {
                let sum = new Complex(0, 0);
                for (let k = 0; k < this.cols; k++) {
                    sum = sum.add(this.data[i][k].multiply(other.data[k][j]));
                }
                result.data[i][j] = sum;
            }
        }

        return result;
    }

    multiplyScalar(scalar) {
        const result = new Matrix(this.rows, this.cols);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[i][j] = this.data[i][j].multiply(scalar);
            }
        }
        return result;
    }

    add(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error("Matrix dimensions don't match for addition");
        }

        const result = new Matrix(this.rows, this.cols);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[i][j] = this.data[i][j].add(other.data[i][j]);
            }
        }
        return result;
    }

    transpose() {
        const result = new Matrix(this.cols, this.rows);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[j][i] = this.data[i][j];
            }
        }
        return result;
    }

    conjugate() {
        const result = new Matrix(this.rows, this.cols);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                result.data[i][j] = this.data[i][j].conjugate();
            }
        }
        return result;
    }

    dagger() {
        return this.conjugate().transpose();
    }

    isUnitary(tolerance = 1e-10) {
        const product = this.multiply(this.dagger());
        const identity = Matrix.identity(this.rows);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const diff = product.data[i][j].subtract(identity.data[i][j]);
                if (diff.magnitude() > tolerance) {
                    return false;
                }
            }
        }
        return true;
    }

    trace() {
        let sum = new Complex(0, 0);
        for (let i = 0; i < Math.min(this.rows, this.cols); i++) {
            sum = sum.add(this.data[i][i]);
        }
        return sum;
    }

    determinant() {
        if (this.rows !== this.cols) {
            throw new Error("Determinant only defined for square matrices");
        }

        if (this.rows === 1) {
            return this.data[0][0];
        }

        if (this.rows === 2) {
            return this.data[0][0].multiply(this.data[1][1])
                .subtract(this.data[0][1].multiply(this.data[1][0]));
        }

        // Laplace expansion for larger matrices
        let det = new Complex(0, 0);
        for (let j = 0; j < this.cols; j++) {
            const minor = this.minor(0, j);
            const sign = (j % 2 === 0) ? 1 : -1;
            const term = this.data[0][j].multiplyScalar(new Complex(sign, 0)).multiply(minor.determinant());
            det = det.add(term);
        }
        return det;
    }

    minor(row, col) {
        const minorData = [];
        for (let i = 0; i < this.rows; i++) {
            if (i === row) continue;
            const minorRow = [];
            for (let j = 0; j < this.cols; j++) {
                if (j === col) continue;
                minorRow.push(this.data[i][j]);
            }
            minorData.push(minorRow);
        }
        return Matrix.fromArray(minorData);
    }

    clone() {
        const data = this.data.map(row =>
            row.map(val => new Complex(val.real, val.imag))
        );
        return new Matrix(this.rows, this.cols, data);
    }

    toString() {
        const rows = this.data.map(row =>
            '[' + row.map(val => val.toString()).join(', ') + ']'
        );
        return '[' + rows.join(',\n ') + ']';
    }
}

class QuantumState {
    constructor(numQubits) {
        this.numQubits = numQubits;
        this.dimension = Math.pow(2, numQubits);
        this.amplitudes = Array(this.dimension).fill().map(() => new Complex(0, 0));

        // Initialize to |0...0⟩ state
        this.amplitudes[0] = new Complex(1, 0);
    }

    static fromAmplitudes(amplitudes) {
        console.log('fromAmplitudes input:', amplitudes.map(a => a.toString()));

        const numQubits = Math.log2(amplitudes.length);
        if (!Number.isInteger(numQubits)) {
            throw new Error("Number of amplitudes must be a power of 2");
        }

        // Check for zero state before creating state
        const norm = Math.sqrt(amplitudes.reduce((sum, amp) => {
            const magnitude = amp instanceof Complex ? amp.magnitude() : Math.abs(amp);
            return sum + magnitude * magnitude;
        }, 0));

        if (norm < 1e-10) {
            throw new Error("Cannot normalize zero vector - all amplitudes are zero");
        }

        const state = new QuantumState(numQubits);
        state.amplitudes = amplitudes.map(amp => {
            if (amp instanceof Complex) return amp.clone(); // Clone to preserve original
            if (typeof amp === 'number') return new Complex(amp, 0);
            return new Complex(0, 0);
        });

        console.log('Before normalize:', state.amplitudes.map(a => a.toString()));
        const normalizedState = state.normalize();
        console.log('After normalize:', normalizedState.amplitudes.map(a => a.toString()));

        return normalizedState;
    }

    static fromBasisState(numQubits, basisIndex) {
        const state = new QuantumState(numQubits);
        state.amplitudes = Array(state.dimension).fill().map(() => new Complex(0, 0));
        state.amplitudes[basisIndex] = new Complex(1, 0);
        return state;
    }

    static fromBitString(bitString) {
        const numQubits = bitString.length;
        const basisIndex = parseInt(bitString, 2);
        return QuantumState.fromBasisState(numQubits, basisIndex);
    }

    normalize() {
        const norm = Math.sqrt(this.amplitudes.reduce((sum, amp) => {
            return sum + amp.magnitude() * amp.magnitude();
        }, 0));

        if (norm < 1e-10) {
            throw new Error("Cannot normalize zero vector");
        }

        this.amplitudes = this.amplitudes.map(amp =>
            amp.divide(new Complex(norm, 0))
        );

        return this;
    }

    applyGate(gateMatrix, targetQubits) {
        if (!(gateMatrix instanceof Matrix)) {
            throw new Error("Gate must be a Matrix");
        }

        // Create full system matrix for the gate
        const fullMatrix = this.createFullGateMatrix(gateMatrix, targetQubits);

        // Apply the gate: |ψ'⟩ = U|ψ⟩
        const newAmplitudes = Array(this.dimension).fill().map(() => new Complex(0, 0));

        for (let i = 0; i < this.dimension; i++) {
            for (let j = 0; j < this.dimension; j++) {
                const term = fullMatrix.data[i][j].multiply(this.amplitudes[j]);
                newAmplitudes[i] = newAmplitudes[i].add(term);
            }
        }

        this.amplitudes = newAmplitudes;
        return this;
    }

    createFullGateMatrix(gateMatrix, targetQubits) {
        const gateSize = gateMatrix.rows;
        const gateQubitCount = Math.log2(gateSize);
        if (!Number.isInteger(gateQubitCount)) {
            throw new Error("Gate matrix size must be a power of 2");
        }
        
        if (targetQubits.length !== gateQubitCount) {
            throw new Error("Number of target qubits must match gate size");
        }

        // Create identity matrix for all qubits
        let fullMatrix = Matrix.identity(this.dimension);

        // Apply gate to target qubits using tensor product
        const allQubits = Array.from({ length: this.numQubits }, (_, i) => i);
        const controlQubits = allQubits.filter(q => !targetQubits.includes(q));

        // Build the full matrix using tensor products
        for (let i = 0; i < this.dimension; i++) {
            for (let j = 0; j < this.dimension; j++) {
                let amplitude = new Complex(1, 0);

                // Check if this transition is allowed
                let allowed = true;
                for (const controlQubit of controlQubits) {
                    const iBit = (i >> (this.numQubits - 1 - controlQubit)) & 1;
                    const jBit = (j >> (this.numQubits - 1 - controlQubit)) & 1;
                    if (iBit !== jBit) {
                        allowed = false;
                        break;
                    }
                }

                if (!allowed) {
                    fullMatrix.data[i][j] = new Complex(0, 0);
                    continue;
                }

                // Extract target qubit indices
                let targetIndex = 0;
                let targetJIndex = 0;

                for (let k = 0; k < targetQubits.length; k++) {
                    const qubit = targetQubits[k];
                    const iBit = (i >> (this.numQubits - 1 - qubit)) & 1;
                    const jBit = (j >> (this.numQubits - 1 - qubit)) & 1;

                    targetIndex = (targetIndex << 1) | iBit;
                    targetJIndex = (targetJIndex << 1) | jBit;
                }

                fullMatrix.data[i][j] = gateMatrix.data[targetIndex][targetJIndex];
            }
        }

        return fullMatrix;
    }

    measure() {
        // Calculate probabilities
        const probabilities = this.amplitudes.map(amp => amp.magnitude() * amp.magnitude());

        // Random measurement
        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (random < cumulative) {
                // Collapse to measured state
                this.amplitudes = Array(this.dimension).fill().map(() => new Complex(0, 0));
                this.amplitudes[i] = new Complex(1, 0);
                return {
                    basisIndex: i,
                    bitString: i.toString(2).padStart(this.numQubits, '0'),
                    probability: probabilities[i]
                };
            }
        }

        // Fallback (shouldn't happen due to floating point precision)
        const lastIndex = probabilities.length - 1;
        this.amplitudes = Array(this.dimension).fill().map(() => new Complex(0, 0));
        this.amplitudes[lastIndex] = new Complex(1, 0);
        return {
            basisIndex: lastIndex,
            bitString: lastIndex.toString(2).padStart(this.numQubits, '0'),
            probability: probabilities[lastIndex]
        };
    }

    getProbabilities() {
        return this.amplitudes.map(amp => amp.magnitude() * amp.magnitude());
    }

    getDensityMatrix() {
        const density = new Matrix(this.dimension, this.dimension);

        for (let i = 0; i < this.dimension; i++) {
            for (let j = 0; j < this.dimension; j++) {
                density.data[i][j] = this.amplitudes[i].multiply(this.amplitudes[j].conjugate());
            }
        }

        return density;
    }

    fidelity(other) {
        if (this.numQubits !== other.numQubits) {
            throw new Error("States must have the same number of qubits");
        }

        let innerProduct = new Complex(0, 0);
        for (let i = 0; i < this.dimension; i++) {
            innerProduct = innerProduct.add(this.amplitudes[i].multiply(other.amplitudes[i].conjugate()));
        }

        return innerProduct.magnitude();
    }

    clone() {
        const cloned = new QuantumState(this.numQubits);
        cloned.amplitudes = this.amplitudes.map(amp => new Complex(amp.real, amp.imag));
        return cloned;
    }

    toString() {
        let result = '|ψ⟩ = ';
        const terms = [];

        for (let i = 0; i < this.amplitudes.length; i++) {
            const amp = this.amplitudes[i];
            if (amp.magnitude() > 1e-10) {
                const bitString = i.toString(2).padStart(this.numQubits, '0');
                terms.push(`${amp.toString()}|${bitString}⟩`);
            }
        }

        return result + terms.join(' + ');
    }
}

// Utility functions
function kroneckerProduct(matrices) {
    if (matrices.length === 0) {
        throw new Error("At least one matrix required");
    }

    let result = matrices[0].clone();

    for (let i = 1; i < matrices.length; i++) {
        const matrix = matrices[i];
        const newRows = result.rows * matrix.rows;
        const newCols = result.cols * matrix.cols;
        const newMatrix = new Matrix(newRows, newCols);

        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                for (let k = 0; k < matrix.rows; k++) {
                    for (let l = 0; l < matrix.cols; l++) {
                        const newRow = i * matrix.rows + k;
                        const newCol = j * matrix.cols + l;
                        newMatrix.data[newRow][newCol] = result.data[i][j].multiply(matrix.data[k][l]);
                    }
                }
            }
        }

        result = newMatrix;
    }

    return result;
}

function tensorProduct(a, b) {
    return kroneckerProduct([a, b]);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Complex,
        Matrix,
        QuantumState,
        kroneckerProduct,
        tensorProduct
    };
}
