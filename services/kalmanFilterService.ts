import { PricePoint } from '../types';

/**
 * Implements a 1D Kalman Filter for price signal smoothing.
 * Based on the formulas from the LUMIA Signal Processing Stack document.
 * State: [price, velocity]
 */
export class KalmanFilter {
  private x: [number, number]; // state [price, velocity]
  private P: [[number, number], [number, number]]; // covariance matrix
  private F: [[number, number], [number, number]]; // state transition matrix
  private H: [number, number]; // observation matrix
  private Q: [[number, number], [number, number]]; // process noise
  private R: number; // observation noise

  constructor(initialPrice: number, q: number = 0.1, r: number = 4) {
    this.x = [initialPrice, 0];
    this.P = [[1, 0], [0, 1]];
    this.F = [[1, 1], [0, 1]]; // price = price + velocity; velocity = velocity
    this.H = [1, 0]; // We only observe the price
    this.Q = [[q, 0], [0, q / 10]]; // Process noise
    this.R = r; // Observation noise
  }

  predict(): void {
    const [x0, x1] = this.x;
    const [[p00, p01], [p10, p11]] = this.P;
    const [[f00, f01], [f10, f11]] = this.F;
    const [[q00, q01], [q10, q11]] = this.Q;

    // x_predicted = F * x
    const x_p: [number, number] = [
      f00 * x0 + f01 * x1,
      f10 * x0 + f11 * x1
    ];

    // P_predicted = F * P * F_transpose + Q
    const P_p: [[number, number], [number, number]] = [
      [
        f00 * (f00 * p00 + f10 * p01) + f01 * (f00 * p10 + f10 * p11) + q00,
        f00 * (f01 * p00 + f11 * p01) + f01 * (f01 * p10 + f11 * p11) + q01
      ],
      [
        f10 * (f00 * p00 + f10 * p01) + f11 * (f00 * p10 + f10 * p11) + q10,
        f10 * (f01 * p00 + f11 * p01) + f11 * (f01 * p10 + f11 * p11) + q11
      ]
    ];

    this.x = x_p;
    this.P = P_p;
  }

  update(z: number): void {
    const [h0, h1] = this.H;
    const [[p00_p, p01_p], [p10_p, p11_p]] = this.P;

    // y = z - H * x_predicted
    const y = z - (h0 * this.x[0] + h1 * this.x[1]);

    // S = H * P_predicted * H_transpose + R
    const S = h0 * (h0 * p00_p + h1 * p10_p) + h1 * (h0 * p01_p + h1 * p11_p) + this.R;

    // K = P_predicted * H_transpose / S
    const K: [number, number] = [
      (p00_p * h0 + p01_p * h1) / S,
      (p10_p * h0 + p11_p * h1) / S
    ];

    // x_updated = x_predicted + K * y
    this.x[0] += K[0] * y;
    this.x[1] += K[1] * y;

    // P_updated = (I - K * H) * P_predicted
    const [[i00, i01], [i10, i11]] = [[1, 0], [0, 1]];
    const kh0 = K[0] * h0, kh1 = K[0] * h1;
    const ikh00 = i00 - kh0, ikh01 = i01 - kh1;
    const kh10 = K[1] * h0, kh11 = K[1] * h1;
    const ikh10 = i10 - kh10, ikh11 = i11 - kh11;

    this.P = [
      [ikh00 * p00_p + ikh01 * p10_p, ikh00 * p01_p + ikh01 * p11_p],
      [ikh10 * p00_p + ikh11 * p10_p, ikh10 * p01_p + ikh11 * p11_p]
    ];
  }

  getState(): { price: number; velocity: number } {
    return { price: this.x[0], velocity: this.x[1] };
  }
}

export const applyKalmanFilter = (data: PricePoint[]): PricePoint[] => {
  if (data.length === 0) return [];

  const kf = new KalmanFilter(data[0].price);
  const filteredData: PricePoint[] = [];

  data.forEach(point => {
    kf.predict();
    kf.update(point.price);
    filteredData.push({ 
      date: point.date, 
      price: kf.getState().price 
    });
  });

  return filteredData;
};
