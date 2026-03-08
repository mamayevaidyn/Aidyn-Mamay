
/**
 * Calculates the average of a series of numbers.
 */
import { Matrix, solve } from 'ml-matrix';
import { PCA } from 'ml-pca';


/**
 * Performs Principal Component Analysis (PCA) to extract statistical factors.
 */
export const performPCA = (assetReturns: number[][]): { loadings: Matrix, explainedVariance: number[] } => {
  const matrix = new Matrix(assetReturns).transpose(); // PCA expects series as columns
  const pca = new PCA(matrix, { center: true, scale: true });
  return {
    loadings: pca.getLoadings(),
    explainedVariance: pca.getExplainedVariance()
  };
};

/**
 * Performs multiple linear regression to find the coefficients (betas).
 * y = Xβ + ε
 * β = (X'X)⁻¹X'y
 */
export const multipleLinearRegression = (y: number[], X: number[][]): number[] => {
  // X is expected to be [factor1_series, factor2_series, ...]
  // We need to transpose it to [ [f1_t1, f2_t1, ...], [f1_t2, f2_t2, ...], ... ]
  // and then add the intercept column.
  
  const observations = y.length;
  const numFactors = X.length;
  
  const XMatrix = new Matrix(observations, numFactors + 1);
  for (let i = 0; i < observations; i++) {
    XMatrix.set(i, 0, 1); // Intercept
    for (let j = 0; j < numFactors; j++) {
      XMatrix.set(i, j + 1, X[j][i]);
    }
  }

  const yMatrix = Matrix.columnVector(y);

  try {
    const Xt = XMatrix.transpose();
    const XtX = Xt.mmul(XMatrix);
    // Add a small ridge to prevent singularity
    const ridge = Matrix.identity(XtX.rows, XtX.columns).mul(1e-6);
    const XtY = Xt.mmul(yMatrix);
    const betaMatrix = solve(XtX.add(ridge), XtY);
    return betaMatrix.to1DArray();
  } catch (error) {
    console.error("Matrix inversion failed. Returning zero betas.", error);
    // Return a zero vector of the correct size if inversion fails
    return new Array(numFactors + 1).fill(0);
  }
};


/**
 * Calculates the average of a series of numbers.
 */
const mean = (data: number[]): number => {
  return data.reduce((a, b) => a + b, 0) / data.length;
};

/**
 * Calculates the variance of a series of numbers.
 */
const variance = (data: number[]): number => {
  const dataMean = mean(data);
  return data.reduce((acc, val) => acc + (val - dataMean) ** 2, 0) / (data.length - 1);
};

/**
 * Calculates the covariance between two series of numbers.
 */
const covariance = (data1: number[], data2: number[]): number => {
  const mean1 = mean(data1);
  const mean2 = mean(data2);
  let covar = 0;
  for (let i = 0; i < data1.length; i++) {
    covar += (data1[i] - mean1) * (data2[i] - mean2);
  }
  return covar / (data1.length - 1);
};

/**
 * Calculates the Beta for an asset given its returns and market returns.
 * β = Cov(R_asset, R_market) / Var(R_market)
 */
export const calculateBeta = (assetReturns: number[], marketReturns: number[]): number => {
  const covar = covariance(assetReturns, marketReturns);
  const marketVar = variance(marketReturns);
  return covar / marketVar;
};

/**
 * Calculates the expected return using the CAPM formula.
 * E(R_i) = R_f + β * (E(R_m) - R_f)
 */
export const calculateCAPM = (beta: number, riskFreeRate: number, marketReturn: number): number => {
  return riskFreeRate + beta * (marketReturn - riskFreeRate);
};

/**
 * Converts a series of prices to a series of percentage returns.
 */
export const pricesToReturns = (prices: number[]): number[] => {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return returns;
};
