import { PricePoint } from '../types';

/**
 * Simulates a Geometric Brownian Motion (GBM) path.
 * Based on the formula from the LUMIA Signal Processing Stack document.
 * S_t = S_0 * exp((μ - σ²/2)t + σ√t * Z)
 */
export const simulateGBM = (initialPrice: number, mu: number, sigma: number, steps: number, dt: number): PricePoint[] => {
  const data: PricePoint[] = [{ date: new Date().toISOString().split('T')[0], price: initialPrice }];
  let currentPrice = initialPrice;
  const now = Date.now();

  for (let i = 1; i <= steps; i++) {
    const Z = Math.random() * 2 - 1; // Simplified normal random variable
    currentPrice *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * Z);
    data.push({
      date: new Date(now + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Number(currentPrice.toFixed(2))
    });
  }
  return data;
};

/**
 * Simulates an Ornstein-Uhlenbeck (OU) mean-reverting process.
 * dX_t = θ(μ - X_t)dt + σ dW_t
 */
export const simulateOU = (initialPrice: number, mu: number, theta: number, sigma: number, steps: number, dt: number): PricePoint[] => {
  const data: PricePoint[] = [{ date: new Date().toISOString().split('T')[0], price: initialPrice }];
  let currentPrice = initialPrice;
  const now = Date.now();

  for (let i = 1; i <= steps; i++) {
    const dW = (Math.random() * 2 - 1) * Math.sqrt(dt);
    const dX = theta * (mu - currentPrice) * dt + sigma * dW;
    currentPrice += dX;
    data.push({
      date: new Date(now + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Number(currentPrice.toFixed(2))
    });
  }
  return data;
};

/**
 * Simulates the Heston stochastic volatility model.
 * dS_t = μS_t dt + sqrt(v_t)S_t dW_t^S
 * dv_t = κ(θ - v_t)dt + ξ sqrt(v_t) dW_t^v
 */
export const simulateHeston = (initialPrice: number, initialVol: number, mu: number, kappa: number, theta: number, xi: number, rho: number, steps: number, dt: number): PricePoint[] => {
  const data: PricePoint[] = [{ date: new Date().toISOString().split('T')[0], price: initialPrice }];
  let currentPrice = initialPrice;
  let currentVol = initialVol;
  const now = Date.now();

  for (let i = 1; i <= steps; i++) {
    const Z1 = (Math.random() * 2 - 1);
    const Z2 = (Math.random() * 2 - 1);
    
    const dWS = Z1 * Math.sqrt(dt);
    const dWV = (rho * Z1 + Math.sqrt(1 - rho * rho) * Z2) * Math.sqrt(dt);

    currentPrice *= (1 + mu * dt + Math.sqrt(currentVol) * dWS);
    currentVol += kappa * (theta - currentVol) * dt + xi * Math.sqrt(currentVol) * dWV;
    currentVol = Math.max(0, currentVol); // Ensure volatility doesn't go negative

    data.push({
      date: new Date(now + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Number(currentPrice.toFixed(2))
    });
  }
  return data;
};

/**
 * Generates multiple GBM paths for Monte Carlo analysis.
 */
export const simulateMonteCarlo = (initialPrice: number, mu: number, sigma: number, steps: number, dt: number, paths: number): PricePoint[][] => {
  return Array.from({ length: paths }).map(() => simulateGBM(initialPrice, mu, sigma, steps, dt));
};
