import { PricePoint } from '../types';

/**
 * Implements an Extended Kalman Filter (EKF).
 * This is a simplified example for a nonlinear observation model.
 * Observation function h(x) = x[0]^1.05 (a slight nonlinearity)
 * Jacobian H = [1.05 * x[0]^0.05, 0]
 */
export class ExtendedKalmanFilter {
  private x: [number, number]; // state [value, velocity]
  private P: [[number, number], [number, number]]; // covariance
  private F: [[number, number], [number, number]]; // transition
  private Q: [[number, number], [number, number]]; // process noise
  private R: number; // observation noise

  constructor(initialValue: number, q: number = 0.1, r: number = 4) {
    this.x = [initialValue, 0];
    this.P = [[1, 0], [0, 1]];
    this.F = [[1, 1], [0, 1]];
    this.Q = [[q, 0], [0, q / 10]];
    this.R = r;
  }

  private h(x_val: number): number {
    return Math.pow(x_val, 1.05);
  }

  private H_jacobian(x_val: number): [number, number] {
    return [1.05 * Math.pow(x_val, 0.05), 0];
  }

  predict(): void {
    const [x0, x1] = this.x;
    const [[p00, p01], [p10, p11]] = this.P;
    const [[f00, f01], [f10, f11]] = this.F;
    const [[q00, q01], [q10, q11]] = this.Q;

    const x_p: [number, number] = [f00 * x0 + f01 * x1, f10 * x0 + f11 * x1];
    const P_p: [[number, number], [number, number]] = [
      [ f00 * (f00 * p00 + f10 * p01) + f01 * (f00 * p10 + f10 * p11) + q00, f00 * (f01 * p00 + f11 * p01) + f01 * (f01 * p10 + f11 * p11) + q01 ],
      [ f10 * (f00 * p00 + f10 * p01) + f11 * (f00 * p10 + f10 * p11) + q10, f10 * (f01 * p00 + f11 * p01) + f11 * (f01 * p10 + f11 * p11) + q11 ]
    ];

    this.x = x_p;
    this.P = P_p;
  }

  update(z: number): void {
    const H = this.H_jacobian(this.x[0]);
    const [[p00_p, p01_p], [p10_p, p11_p]] = this.P;

    const y = z - this.h(this.x[0]);
    const S = H[0] * (H[0] * p00_p + H[1] * p10_p) + H[1] * (H[0] * p01_p + H[1] * p11_p) + this.R;
    const K: [number, number] = [(p00_p * H[0] + p01_p * H[1]) / S, (p10_p * H[0] + p11_p * H[1]) / S];

    this.x[0] += K[0] * y;
    this.x[1] += K[1] * y;

    const I_KH: [[number, number], [number, number]] = [
      [1 - K[0] * H[0], -K[0] * H[1]],
      [-K[1] * H[0], 1 - K[1] * H[1]]
    ];
    
    this.P = [
      [I_KH[0][0] * p00_p + I_KH[0][1] * p10_p, I_KH[0][0] * p01_p + I_KH[0][1] * p11_p],
      [I_KH[1][0] * p00_p + I_KH[1][1] * p10_p, I_KH[1][0] * p01_p + I_KH[1][1] * p11_p]
    ];
  }

  getState(): { value: number; velocity: number } {
    return { value: this.x[0], velocity: this.x[1] };
  }
}

export const applyEKF = (data: PricePoint[]): PricePoint[] => {
  if (data.length === 0) return [];
  const ekf = new ExtendedKalmanFilter(data[0].price);
  return data.map(point => {
    ekf.predict();
    ekf.update(point.price);
    return { date: point.date, price: ekf.getState().value };
  });
};
