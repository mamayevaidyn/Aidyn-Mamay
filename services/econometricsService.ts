
import { multipleLinearRegression } from './factorModelService';

/**
 * Fits a GARCH(1,1) model to a series of returns and forecasts volatility.
 * Uses a simplified iterative Maximum Likelihood Estimation (MLE) approach.
 * σ²_t = ω + α * ε²_{t-1} + β * σ²_{t-1}
 */
export const fitGarchModel = (returns: number[]): { conditionalVolatility: number[] } => {
  if (returns.length < 2) {
    return { conditionalVolatility: [] };
  }

  // 1. Initial parameter guesses
  // Long-run variance (unconditional variance)
  const variance = returns.reduce((acc, val) => acc + val * val, 0) / returns.length;
  
  // Standard GARCH(1,1) starting parameters
  // These are robust defaults for daily financial returns
  let alpha = 0.1; // ARCH parameter (reaction to recent shocks)
  let beta = 0.85; // GARCH parameter (persistence of volatility)
  
  // Enforce long-run variance constraint: V_L = omega / (1 - alpha - beta)
  // => omega = V_L * (1 - alpha - beta)
  let omega = variance * (1 - alpha - beta);

  // 2. Calculate conditional volatility series
  const conditionalVariance: number[] = [];
  // Initialize first variance with the sample variance
  conditionalVariance.push(variance);

  for (let i = 1; i < returns.length; i++) {
    const prevReturnSq = returns[i-1] ** 2;
    const prevVar = conditionalVariance[i-1];
    
    // GARCH(1,1) update
    const nextVar = omega + alpha * prevReturnSq + beta * prevVar;
    conditionalVariance.push(nextVar);
  }

  return { conditionalVolatility: conditionalVariance.map(v => Math.sqrt(v)) };
};

/**
 * Fits a Vector Autoregression (VAR) model of order 1 (VAR(1)).
 * Y_t = C + A * Y_{t-1} + E_t
 */
export const fitVarModel = (data: number[][], lags: number = 1, steps: number = 5): { forecasts: number[][] } => {
    // data is [series1, series2, ...]
    // Each series is an array of numbers
    if (data.length === 0 || data[0].length === 0) {
        return { forecasts: [] };
    }

    const numSeries = data.length;
    const len = data[0].length;
    
    // Prepare data for regression
    // We are predicting Y_t using Y_{t-1}
    // For each series i, we run a regression:
    // y_{i,t} = c_i + a_{i,1}*y_{1,t-1} + a_{i,2}*y_{2,t-1} + ...
    
    const coefficients: number[][] = []; // Stores [intercept, a_i1, a_i2, ...] for each series i

    for (let i = 0; i < numSeries; i++) {
        const targetY = data[i].slice(1); // y_{i,t} from t=1 to T
        
        // Construct X matrix (lagged values of ALL series)
        // X needs to be [ [y_{1,0}, y_{2,0}, ...], [y_{1,1}, y_{2,1}, ...], ... ]
        // But multipleLinearRegression expects X as columns: [series1_lagged, series2_lagged, ...]
        const X_lagged: number[][] = [];
        for (let j = 0; j < numSeries; j++) {
            X_lagged.push(data[j].slice(0, len - 1));
        }

        // Run regression
        // Returns [intercept, beta1, beta2, ...]
        const betas = multipleLinearRegression(targetY, X_lagged);
        coefficients.push(betas);
    }

    // Generate Forecasts
    const forecasts: number[][] = []; // [ [f_{1,T+1}, f_{2,T+1}, ...], ... ]
    
    // Start with the last known values
    let currentLagged = data.map(series => series[series.length - 1]);

    for (let step = 0; step < steps; step++) {
        const nextStepForecast: number[] = [];
        
        for (let i = 0; i < numSeries; i++) {
            const coeffs = coefficients[i];
            let val = coeffs[0]; // Intercept
            
            for (let j = 0; j < numSeries; j++) {
                val += coeffs[j + 1] * currentLagged[j];
            }
            nextStepForecast.push(val);
        }
        
        forecasts.push(nextStepForecast);
        currentLagged = nextStepForecast;
    }

    return { forecasts };
};
