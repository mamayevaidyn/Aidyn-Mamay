import { PricePoint } from '../types';

/**
 * Implements an Unscented Kalman Filter (UKF).
 * Based on the formulas from the LUMIA Signal Processing Stack document.
 * Uses sigma points to handle nonlinearity without linearization.
 */
export class UnscentedKalmanFilter {
  private x: number[]; // state vector
  private P: number[][]; // covariance matrix
  private Q: number[][]; // process noise
  private R: number; // observation noise
  private n: number; // state dimension
  private lambda: number;
  private weights_m: number[];
  private weights_c: number[];

  constructor(initialValue: number, n: number = 2, q: number = 0.1, r: number = 4, alpha: number = 1e-3, beta: number = 2, kappa: number = 0) {
    this.n = n;
    this.x = [initialValue, 0];
    this.P = [[1, 0], [0, 1]];
    this.Q = [[q, 0], [0, q / 10]];
    this.R = r;

    this.lambda = alpha * alpha * (n + kappa) - n;
    this.weights_m = new Array(2 * n + 1).fill(0.5 / (n + this.lambda));
    this.weights_c = new Array(2 * n + 1).fill(0.5 / (n + this.lambda));
    this.weights_m[0] = this.lambda / (n + this.lambda);
    this.weights_c[0] = this.lambda / (n + this.lambda) + (1 - alpha * alpha + beta);
  }

  private generateSigmaPoints(): number[][] {
    const sigmaPoints: number[][] = new Array(2 * this.n + 1).fill(0).map(() => new Array(this.n).fill(0));
    const P_sqrt = this.cholesky(this.P);
    const term = Math.sqrt(this.n + this.lambda);

    sigmaPoints[0] = [...this.x];
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        sigmaPoints[i + 1][j] = this.x[j] + term * P_sqrt[j][i];
        sigmaPoints[i + 1 + this.n][j] = this.x[j] - term * P_sqrt[j][i];
      }
    }
    return sigmaPoints;
  }

  private cholesky(A: number[][]): number[][] {
    const n = A.length;
    const L = new Array(n).fill(0).map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          L[i][j] = Math.sqrt(A[i][i] - sum);
        } else {
          L[i][j] = (1.0 / L[j][j] * (A[i][j] - sum));
        }
      }
    }
    return L;
  }

  private f(x: number[]): number[] {
    return [x[0] + x[1], x[1]]; // Linear state transition
  }

  private h(x: number[]): number {
    return Math.pow(x[0], 1.05); // Nonlinear observation
  }

  predict(): void {
    const sigmaPoints = this.generateSigmaPoints();
    const propagatedPoints = sigmaPoints.map(sp => this.f(sp));

    // Predicted state mean
    this.x = new Array(this.n).fill(0);
    for (let i = 0; i < 2 * this.n + 1; i++) {
      for (let j = 0; j < this.n; j++) {
        this.x[j] += this.weights_m[i] * propagatedPoints[i][j];
      }
    }

    // Predicted state covariance
    this.P = new Array(this.n).fill(0).map(() => new Array(this.n).fill(0));
    for (let i = 0; i < 2 * this.n + 1; i++) {
      const diff = propagatedPoints[i].map((val, idx) => val - this.x[idx]);
      for (let j = 0; j < this.n; j++) {
        for (let k = 0; k < this.n; k++) {
          this.P[j][k] += this.weights_c[i] * diff[j] * diff[k];
        }
      }
    }
    for (let j = 0; j < this.n; j++) {
        for (let k = 0; k < this.n; k++) {
            this.P[j][k] += this.Q[j][k];
        }
    }
  }

  update(z: number): void {
    const sigmaPoints = this.generateSigmaPoints(); // Use predicted state
    const observedPoints = sigmaPoints.map(sp => this.h(sp));

    // Predicted observation mean
    let z_pred = 0;
    for (let i = 0; i < 2 * this.n + 1; i++) {
      z_pred += this.weights_m[i] * observedPoints[i];
    }

    // Predicted observation covariance
    let S = this.R;
    for (let i = 0; i < 2 * this.n + 1; i++) {
      S += this.weights_c[i] * (observedPoints[i] - z_pred) * (observedPoints[i] - z_pred);
    }

    // Cross-covariance
    const T = new Array(this.n).fill(0);
    for (let i = 0; i < 2 * this.n + 1; i++) {
      const x_diff = sigmaPoints[i].map((val, idx) => val - this.x[idx]);
      const z_diff = observedPoints[i] - z_pred;
      for (let j = 0; j < this.n; j++) {
        T[j] += this.weights_c[i] * x_diff[j] * z_diff;
      }
    }

    // Kalman gain
    const K = T.map(val => val / S);

    // Update state and covariance
    const y = z - z_pred;
    for (let i = 0; i < this.n; i++) {
      this.x[i] += K[i] * y;
    }
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        this.P[i][j] -= K[i] * S * K[j];
      }
    }
  }
  
  getState(): { value: number; velocity: number } {
    return { value: this.x[0], velocity: this.x[1] };
  }
}

export const applyUKF = (data: PricePoint[]): PricePoint[] => {
  if (data.length === 0) return [];
  const ukf = new UnscentedKalmanFilter(data[0].price);
  return data.map(point => {
    ukf.predict();
    ukf.update(point.price);
    return { date: point.date, price: ukf.getState().value };
  });
};
