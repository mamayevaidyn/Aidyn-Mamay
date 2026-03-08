
import { Asset, MarketRegime, RiskMetrics, MarketSnapshot, PricePoint, Factor, Valuation, Projection, MonteCarloResult } from '../types';

/**
 * Calculates Intrinsic Value using a multi-stage DCF and Graham's Number with safety guards.
 */
export const calculateValuation = (asset: Asset): Valuation => {
  const fundamentals = asset.fundamentals || {};
  const eps = fundamentals.eps || 0;
  const bvps = fundamentals.bookValue || 0;
  
  // Robust shares parsing
  let shares = 1;
  if (fundamentals.sharesOutstanding) {
    const raw = fundamentals.sharesOutstanding.toString().toUpperCase();
    const multiplier = raw.includes('B') ? 1e9 : raw.includes('M') ? 1e6 : 1;
    shares = parseFloat(raw.replace(/[^0-9.]/g, '')) * multiplier;
  }

  // FCF Estimation
  // If FCF is not provided, estimate it from EPS * Shares (very rough proxy)
  // If EPS is negative, FCF will be negative, which breaks DCF.
  const fcf = fundamentals.fcf || (eps * shares);
  
  const wacc = fundamentals.wacc || 0.09;
  const terminalGrowth = fundamentals.terminalGrowth || 0.02;
  const growthRate = asset.sector === 'Technology' || asset.sector === 'Crypto' ? 0.12 : 0.04;
  
  // 1. Graham Number (with safety checks)
  let grahamValue = 0;
  if (eps > 0 && bvps > 0) {
    grahamValue = Math.sqrt(22.5 * eps * bvps);
  }

  // 2. Multi-stage DCF
  // If FCF is negative, DCF is invalid for this simple model.
  let dcfValue = 0;
  
  if (fcf > 0) {
    const calculateDCF = (currentFCF: number, g: number, r: number, tg: number, years: number) => {
      let pv = 0;
      let projectedFCF = currentFCF;
      for (let t = 1; t <= years; t++) {
        projectedFCF *= (1 + g);
        pv += projectedFCF / Math.pow(1 + r, t);
      }
      const terminalValue = (projectedFCF * (1 + tg)) / (r - tg);
      pv += terminalValue / Math.pow(1 + r, years);
      
      // Convert total value to per-share
      // If currentFCF was already small (per share), don't divide. 
      // Heuristic: if FCF > 1M, it's likely total FCF.
      return currentFCF < 10000 ? pv : pv / (shares || 1);
    };

    dcfValue = calculateDCF(fcf, growthRate, wacc, terminalGrowth, 5);
  }
  
  // Hybrid approach
  const isGrowth = asset.sector === 'Technology' || asset.sector === 'Crypto' || (fundamentals.peRatio && fundamentals.peRatio > 30);
  
  // If we have no valid valuation methods (negative earnings & FCF), return 0/N/A
  if (dcfValue === 0 && grahamValue === 0) {
    return {
      intrinsicValue: 0,
      marginOfSafety: 0,
      rating: 'N/A',
      method: 'Insufficient Data (Neg Earnings)'
    };
  }

  const intrinsicValue = isGrowth 
    ? (dcfValue > 0 ? dcfValue * 0.8 + grahamValue * 0.2 : grahamValue) 
    : (grahamValue > 0 ? grahamValue * 0.6 + dcfValue * 0.4 : dcfValue);

  // Final sanity check for 0
  if (intrinsicValue <= 0) {
    return {
      intrinsicValue: 0,
      marginOfSafety: 0,
      rating: 'N/A',
      method: 'Insufficient Data'
    };
  }

  const marginOfSafety = ((intrinsicValue - asset.price) / intrinsicValue) * 100;
  
  let rating: Valuation['rating'] = 'FAIR';
  if (marginOfSafety > 20) rating = 'UNDERVALUED';
  else if (marginOfSafety < -20) rating = 'OVERVALUED';

  return {
    intrinsicValue: Number(intrinsicValue.toFixed(2)),
    marginOfSafety: Number(marginOfSafety.toFixed(1)),
    rating,
    method: isGrowth ? 'Multi-stage DCF' : 'Graham-DCF Hybrid'
  };
};

export interface BacktestResult {
  data: { date: string, value: number, benchmark: number, drawdown: number }[];
  metrics: {
    sharpe: number;
    alpha: number;
    beta: number;
    maxDrawdown: number;
    volatility: number;
  };
}

/**
 * Generates a statistical backtest simulation using Geometric Brownian Motion (GBM).
 * This is a Monte Carlo simulation of historical paths based on real asset metrics.
 */
export const generateBacktestData = (assets: Asset[], days: number = 252): BacktestResult => {
  const data: { date: string, value: number, benchmark: number, drawdown: number }[] = [];
  let portValue = 100;
  let benchValue = 100;
  let peak = 100;
  let maxDrawdown = 0;
  const now = Date.now();

  const metrics = calculatePortfolioMetrics(assets);
  const avgBeta = metrics.beta;
  const avgVol = metrics.volatility / 100;
  const alpha = metrics.alpha / 100;
  
  const portReturns: number[] = [];
  const benchReturns: number[] = [];

  // Market parameters (S&P 500 historical approx)
  const marketMu = 0.10 / 252; // Daily drift
  const marketSigma = 0.15 / Math.sqrt(252); // Daily vol

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Box-Muller for normal distribution
    const u1 = Math.random(); const u2 = Math.random();
    const z_m = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z_p = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random());

    // Benchmark Return (GBM)
    const benchReturn = marketMu + marketSigma * z_m;
    benchValue *= (1 + benchReturn);
    benchReturns.push(benchReturn);

    // Portfolio Return: Beta * Market + Alpha + Idiosyncratic Risk
    // FIX: Scale idiosyncratic volatility to daily: vol / sqrt(252)
    const annualizedMarketVol = 0.15;
    const systematicVariance = Math.pow(avgBeta * annualizedMarketVol, 2);
    const totalVariance = Math.pow(avgVol, 2);
    const idiosyncraticVariance = Math.max(0, totalVariance - systematicVariance);
    const dailyIdiosyncraticVol = Math.sqrt(idiosyncraticVariance) / Math.sqrt(252);
    
    const portReturn = (avgBeta * benchReturn) + (alpha / 252) + (dailyIdiosyncraticVol * z_p);
    
    portValue *= (1 + portReturn);
    portReturns.push(portReturn);

    // Calc Drawdown
    if (portValue > peak) peak = portValue;
    const dd = ((portValue - peak) / peak) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;

    data.push({ date, value: portValue, benchmark: benchValue, drawdown: dd });
  }

  // Calculate Sharpe
  const meanReturn = portReturns.reduce((a, b) => a + b, 0) / portReturns.length;
  const stdDev = Math.sqrt(portReturns.map(x => Math.pow(x - meanReturn, 2)).reduce((a, b) => a + b, 0) / portReturns.length);
  const annualizedReturn = meanReturn * 252;
  const annualizedVol = stdDev * Math.sqrt(252);
  const sharpe = (annualizedReturn - 0.04) / (annualizedVol || 1);

  return {
    data,
    metrics: {
      sharpe: Number(sharpe.toFixed(2)),
      alpha: Number((alpha * 100).toFixed(2)),
      beta: Number(avgBeta.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      volatility: Number((annualizedVol * 100).toFixed(2))
    }
  };
};

export const projectPrice = (asset: Asset, market: MarketSnapshot): Projection => {
  const momentum = (asset.technicals?.rsi || 50) - 50;
  const marketRiskPremium = 0.06;
  const expectedReturn = 0.0425 + asset.beta * marketRiskPremium + (momentum * 0.001);
  const targetPrice = asset.price * (1 + expectedReturn / 12);
  
  return {
    targetPrice: Number(targetPrice.toFixed(2)),
    probability: Math.min(0.85, 0.5 + (Math.abs(momentum) / 200)),
    timeframe: '30D',
    reasoning: `Projected via Factor-Momentum Drift. Beta loading of ${asset.beta.toFixed(2)}.`
  };
};

export const MARKET_UNIVERSE: Asset[] = [
  { 
    ticker: 'TSLA', name: 'Tesla Inc', weight: 0, price: 258.42, beta: 2.1, volatility: 0.55, sector: 'Consumer Cyclical',
    technicals: { rsi: 42, sma50: 315.2, sma200: 258.1, volume: 95000000 },
    fundamentals: { peRatio: 72.4, marketCap: '820B', dividendYield: 0, earningsYield: 0.012, eps: 4.51, bookValue: 18.40 }
  },
  { 
    ticker: 'NVDA', name: 'Nvidia Corp', weight: 0, price: 142.85, beta: 1.8, volatility: 0.45, sector: 'Technology',
    technicals: { rsi: 52, sma50: 138.2, sma200: 125.4, volume: 55000000 },
    fundamentals: { peRatio: 58.2, marketCap: '3.4T', dividendYield: 0.01, earningsYield: 0.014, eps: 2.17, bookValue: 5.80 }
  },
  { 
    ticker: 'BTC', name: 'Bitcoin', weight: 0, price: 92450.20, beta: 2.5, volatility: 0.65, sector: 'Crypto',
    technicals: { rsi: 62, sma50: 88000, sma200: 68000, volume: 45000000000 },
    fundamentals: { peRatio: 0, marketCap: '1.85T', dividendYield: 0, earningsYield: 0, eps: 0, bookValue: 0 }
  },
  { 
    ticker: 'AAPL', name: 'Apple Inc', weight: 0, price: 242.40, beta: 1.1, volatility: 0.22, sector: 'Technology',
    technicals: { rsi: 55, sma50: 235.1, sma200: 212.4, volume: 38000000 },
    fundamentals: { peRatio: 32.5, marketCap: '3.65T', dividendYield: 0.42, earningsYield: 0.031, eps: 7.33, bookValue: 4.20 }
  },
  { 
    ticker: 'JPM', name: 'JPMorgan Chase', weight: 0, price: 195.20, beta: 1.1, volatility: 0.18, sector: 'Financials',
    technicals: { rsi: 48, sma50: 190.2, sma200: 175.4, volume: 12000000 },
    fundamentals: { peRatio: 12.4, marketCap: '560B', dividendYield: 2.1, earningsYield: 0.08, eps: 16.20, bookValue: 98.40 }
  },
  { 
    ticker: 'BLK', name: 'BlackRock Inc', weight: 0, price: 820.45, beta: 1.2, volatility: 0.22, sector: 'Financials',
    technicals: { rsi: 50, sma50: 810.2, sma200: 780.4, volume: 800000 },
    fundamentals: { peRatio: 19.2, marketCap: '122B', dividendYield: 2.4, earningsYield: 0.05, eps: 38.20, bookValue: 245.10 }
  },
  { 
    ticker: 'CVX', name: 'Chevron Corp', weight: 0, price: 158.12, beta: 0.8, volatility: 0.24, sector: 'Energy',
    technicals: { rsi: 45, sma50: 160.2, sma200: 155.4, volume: 8000000 },
    fundamentals: { peRatio: 14.2, marketCap: '295B', dividendYield: 4.1, earningsYield: 0.07, eps: 11.50, bookValue: 85.20 }
  },
  { 
    ticker: 'PLTR', name: 'Palantir Tech', weight: 0, price: 32.45, beta: 1.6, volatility: 0.52, sector: 'Technology',
    technicals: { rsi: 58, sma50: 28.2, sma200: 22.4, volume: 45000000 },
    fundamentals: { peRatio: 155.2, marketCap: '72B', dividendYield: 0, earningsYield: 0.006, eps: 0.21, bookValue: 1.80 }
  }
];

export const calculateCorrelationMatrix = (assets: Asset[]) => {
  const tickers = assets.map(a => a.ticker);
  const matrix: number[][] = [];
  const pairs: { pair: string, val: number }[] = [];

  for (let i = 0; i < assets.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < assets.length; j++) {
      const corr = calculateCorrelation(assets[i], assets[j]);
      matrix[i][j] = corr;
      if (i < j) {
        pairs.push({ pair: `${assets[i].ticker}-${assets[j].ticker}`, val: corr });
      }
    }
  }
  // Sort by absolute correlation strength
  pairs.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
  
  return { tickers, matrix, topPairs: pairs.slice(0, 5) };
};

export const calculateTailRisk = (assets: Asset[]) => {
  const metrics = calculatePortfolioMetrics(assets);
  // Simple Tail Risk Proxy: 
  // Probability of a 3-sigma event based on volatility
  // Assuming fat tails (kurtosis), we bump normal prob.
  const sigma = metrics.volatility / 100; // Annualized
  const dailyVol = sigma / Math.sqrt(252);
  
  // Probability of > 3 sigma move in next 30 days
  // Normal dist 3-sigma is 0.3%. Fat tail assumption ~1-2%.
  const tailProb = 0.015 + (metrics.beta > 1.5 ? 0.02 : 0);
  
  let event = "Market Liquidity Shock";
  let mitigation = "Diversify across non-correlated asset classes.";

  if (metrics.beta > 1.3) {
    event = "High-Beta Drawdown";
    mitigation = "Consider hedging with put options or reducing leverage.";
  } else if (metrics.diversificationScore < 40) {
    event = "Concentration Risk Failure";
    mitigation = "Rebalance portfolio to reduce single-asset exposure.";
  }

  return {
    probability: tailProb,
    event,
    mitigation
  };
};

export const calculateRiskContributions = (assets: Asset[]) => {
  if (assets.length === 0) return [];
  const totalValue = assets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
  const normAssets = assets.map(a => {
    const assetValue = (a.price * (a.quantity || 0));
    return { ...a, weight: totalValue > 0 ? assetValue / totalValue : 0 };
  });

  // Marginal Contribution to Risk (MCTR)
  // Approximate: Contribution_i = w_i * Cov(R_i, R_p) / Var(R_p)
  // For simplicity, we'll use w_i * beta_i * vol_i
  const contributions = normAssets.map(a => ({
    ticker: a.ticker,
    value: a.weight * a.beta * a.volatility
  }));
  const total = contributions.reduce((sum, c) => sum + c.value, 0) || 1;
  return contributions.map(c => ({
    ticker: c.ticker,
    percentage: Number(((c.value / total) * 100).toFixed(2))
  }));
};

export const calculatePortfolioMetrics = (assets: Asset[]): RiskMetrics => {
  if (assets.length === 0) {
    return { 
      var95: 0, 
      expectedShortfall: 0, 
      diversificationScore: 0, 
      volatility: 0, 
      beta: 0, 
      alpha: 0, 
      systemicRisk: 0,
      dailyChange: 0,
      sharpeRatio: 0
    };
  }
  
  const totalValue = assets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
  const normAssets = assets.map(a => {
    const assetValue = (a.price * (a.quantity || 0));
    return { ...a, weight: totalValue > 0 ? assetValue / totalValue : 0 };
  });

  const avgBeta = normAssets.reduce((acc, a) => acc + (a.beta * a.weight), 0);
  
  // Real Portfolio Volatility using Covariance Matrix Approximation
  // σ_p = √(wᵀ Σ w)
  let portfolioVariance = 0;
  for (let i = 0; i < normAssets.length; i++) {
    for (let j = 0; j < normAssets.length; j++) {
      const a1 = normAssets[i];
      const a2 = normAssets[j];
      const correlation = calculateCorrelation(a1, a2);
      portfolioVariance += a1.weight * a2.weight * a1.volatility * a2.volatility * correlation;
    }
  }
  
  const portfolioVolAnnual = Math.sqrt(portfolioVariance);
  const portfolioVolPct = portfolioVolAnnual * 100;
  
  // *** FIX: Scale from ANNUAL to MONTHLY for VaR ***
  // Monthly vol = Annual vol / sqrt(12)
  const monthlyVol = portfolioVolAnnual / Math.sqrt(12);
  const monthlyVolPct = monthlyVol * 100;
  
  // Alpha Calculation
  const riskFreeRate = 0.0425;
  const marketReturn = 0.12;
  const portfolioReturn = normAssets.reduce((acc, a) => {
    const r = a.fundamentals?.historicalReturn1y || (riskFreeRate + a.beta * (marketReturn - riskFreeRate) + 0.02);
    return acc + (r * a.weight);
  }, 0);
  
  const alpha = (portfolioReturn - (riskFreeRate + avgBeta * (marketReturn - riskFreeRate))) * 100;
  
  // *** PATCHED VaR: now uses MONTHLY vol, not annual ***
  const var95 = monthlyVolPct * 1.645;
  const expectedShortfall = monthlyVolPct * 2.06;
  
  const dailyChange = normAssets.reduce((acc, a) => acc + ((a.lastChange || 0) * a.weight), 0);
  const sharpeRatio = (portfolioReturn - riskFreeRate) / (portfolioVolAnnual || 1);

  // Advanced Metrics
  const returns = Object.values(historicalReturnsCache).flat();
  const kurtosisData = calculateKurtosis(returns);
  
  // Signal Strength via Kalman Filter
  const kf = new KalmanFilterEngine(totalValue || 100000);
  let noiseSum = 0;
  let signalSum = 0;
  
  // Simulate last 20 days for signal analysis
  for (let i = 0; i < 20; i++) {
    const obs = (totalValue || 100000) * (1 + (dailyChange / 100) * (Math.random() - 0.5) * 2);
    const state = kf.update(obs);
    noiseSum += Math.abs(obs - state.price);
    signalSum += Math.abs(state.velocity);
  }
  
  const snr = signalSum / (noiseSum || 1e-6);
  let signalStrength: 'HIGH_CONVICTION' | 'MODERATE' | 'LOW_SIGNAL' | 'NOISE_DOMINANT' = 'LOW_SIGNAL';
  if (snr > 4) signalStrength = 'HIGH_CONVICTION';
  else if (snr > 1.5) signalStrength = 'MODERATE';
  else if (snr > 0.5) signalStrength = 'LOW_SIGNAL';
  else signalStrength = 'NOISE_DOMINANT';

  const noiseScore = Math.max(0, 100 - (noiseSum / (totalValue || 1e-6) * 10000));
  
  // Breach Rate Estimation
  const breachRate = calculateBreachRate(returns, monthlyVol);
  
  // Regime Confidence
  const prices = returns.reduce((acc, r) => {
    const last = acc.length > 0 ? acc[acc.length - 1] : 100;
    acc.push(last * (1 + r));
    return acc;
  }, [] as number[]);
  const { confidence, probabilities } = detectRegime(prices, returns.map(r => Math.abs(r)));

  // Improved Diversification Score
  const n = normAssets.length;
  
  // 1. Weight Concentration (HHI)
  const hhi = normAssets.reduce((acc, a) => acc + Math.pow(a.weight, 2), 0);
  const weightScore = n > 1 ? (1 - hhi) / (1 - 1/n) : 0;
  
  // 2. Sector Concentration
  const sectorWeights: Record<string, number> = {};
  normAssets.forEach(a => {
    const s = a.sector || 'Unknown';
    sectorWeights[s] = (sectorWeights[s] || 0) + a.weight;
  });
  const sectorHHI = Object.values(sectorWeights).reduce((acc, w) => acc + Math.pow(w, 2), 0);
  // sectorScore: 1 = perfectly distributed across many sectors, 0 = all in one sector
  const sectorScore = 1 - Math.sqrt(sectorHHI); 

  // 3. Correlation Penalty
  let totalCorr = 0;
  let pairs = 0;
  for (let i = 0; i < normAssets.length; i++) {
    for (let j = i + 1; j < normAssets.length; j++) {
      totalCorr += calculateCorrelation(normAssets[i], normAssets[j]);
      pairs++;
    }
  }
  const avgCorr = pairs > 0 ? totalCorr / pairs : 0;
  const corrPenalty = Math.max(0, avgCorr);
  
  // 4. Count Bonus (diminishing returns up to 20 assets)
  const countBonus = Math.min(1, n / 20);
  
  // Weighted Final Score
  // Weights: Sector (40%), Correlation (30%), Weight Distribution (20%), Count (10%)
  let rawScore = (sectorScore * 0.40) + ((1 - corrPenalty) * 0.30) + (weightScore * 0.20) + (countBonus * 0.10);
  
  // Hard Penalty: If > 60% in one sector, score cannot exceed 60
  const maxSectorWeight = Math.max(...Object.values(sectorWeights));
  if (maxSectorWeight > 0.6) {
    rawScore = Math.min(rawScore, 0.60);
  }
  
  const diversificationScore = Math.max(0, Math.min(100, rawScore * 100));

  return {
    var95: Number(var95.toFixed(2)),
    expectedShortfall: Number(expectedShortfall.toFixed(2)),
    diversificationScore: Number(diversificationScore.toFixed(0)),
    volatility: portfolioVolPct,
    beta: avgBeta,
    alpha: Number(alpha.toFixed(2)),
    systemicRisk: (avgBeta * 35) + (portfolioVolPct * 0.4),
    dailyChange: Number(dailyChange.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    kurtosis: kurtosisData.kurtosis,
    skewness: kurtosisData.skewness,
    kurtosisLabel: kurtosisData.label,
    signalStrength,
    snr,
    noiseScore,
    breachRate: breachRate.rate,
    breachLabel: breachRate.label,
    regimeConfidence: Number((confidence * 100).toFixed(0)),
    regimeProbs: probabilities
  };
};

export const getMarketSnapshot = (): MarketSnapshot => ({
  spy: 687.92, qqq: 582.45, vix: 19.86, yield10y: 4.25, topGainer: 'NVDA (+3.2%)', topLoser: 'XOM (-0.8%)'
});

export const getMarketRegime = (): MarketRegime => {
  const returns = Object.values(historicalReturnsCache).flat();
  if (returns.length < 20) {
    const snapshot = getMarketSnapshot();
    if (snapshot.vix > 25) return MarketRegime.CONTRACTION;
    if (snapshot.vix > 15) return MarketRegime.TRANSITIONAL;
    return MarketRegime.EXPANSION;
  }
  
  // Use HMM for regime detection
  const result = detectRegime(returns.map((_, i) => i), []); // Prices are returns here, detectRegime handles it
  if (result.regime === 'BULL') return MarketRegime.EXPANSION;
  if (result.regime === 'BEAR') return MarketRegime.CONTRACTION;
  return MarketRegime.TRANSITIONAL;
};

export const runMonteCarlo = (volatility: number, paths: number = 10000): number[] => {
  const results: number[] = [];
  const dt = 1/252; // Daily steps
  const drift = 0.05; // 5% annual drift assumption
  
  for (let i = 0; i < paths; i++) {
    const u1 = Math.random(); const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    // Geometric Brownian Motion result for 1 month (21 days)
    const result = 100 * Math.exp((drift - 0.5 * Math.pow(volatility, 2)) * (21/252) + volatility * Math.sqrt(21/252) * z);
    results.push(result);
  }
  return results.sort((a, b) => a - b);
};

// ============================================================================
// FIX #1: REAL CORRELATION FROM HISTORICAL DATA
// ============================================================================

/**
 * Cache for historical returns to avoid re-fetching.
 * Key: ticker, Value: array of daily log-returns
 */
const historicalReturnsCache: Record<string, number[]> = {};

/**
 * Store historical price data for correlation calculation.
 * Call this after fetching historical data for each asset.
 */
export const cacheHistoricalReturns = (ticker: string, prices: number[]) => {
  if (prices.length < 2) return;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / (prices[i - 1] || 1)));
  }
  historicalReturnsCache[ticker] = returns;
};

/**
 * PATCHED: Real Pearson correlation from historical returns.
 * Falls back to sector/beta heuristic ONLY if no historical data available.
 */
export const calculateCorrelation = (a1: Asset, a2: Asset): number => {
  if (a1.ticker === a2.ticker) return 1.0;

  const r1 = historicalReturnsCache[a1.ticker];
  const r2 = historicalReturnsCache[a2.ticker];

  // If we have real historical data for both, use Pearson correlation
  if (r1 && r2 && r1.length > 10 && r2.length > 10) {
    const T = Math.min(r1.length, r2.length);
    const slice1 = r1.slice(-T);
    const slice2 = r2.slice(-T);

    const mean1 = slice1.reduce((a, b) => a + b, 0) / T;
    const mean2 = slice2.reduce((a, b) => a + b, 0) / T;

    let cov = 0, var1 = 0, var2 = 0;
    for (let t = 0; t < T; t++) {
      const d1 = slice1[t] - mean1;
      const d2 = slice2[t] - mean2;
      cov += d1 * d2;
      var1 += d1 * d1;
      var2 += d2 * d2;
    }

    const denom = Math.sqrt(var1 * var2);
    if (denom > 1e-9) {
      return Number(Math.max(-0.99, Math.min(0.99, cov / denom)).toFixed(4));
    }
  }

  // Fallback: sector + beta heuristic (labeled as estimate in UI)
  let base = 0.30;
  if (a1.sector === a2.sector) base += 0.35;
  
  // Cross-asset class adjustments
  const isCrypto1 = a1.sector === 'Crypto';
  const isCrypto2 = a2.sector === 'Crypto';
  if (isCrypto1 !== isCrypto2) base -= 0.10; // Crypto less correlated with equities
  
  const betaSim = 1 - Math.min(1, Math.abs(a1.beta - a2.beta) / 3.0);
  const volSim = 1 - Math.min(1, Math.abs(a1.volatility - a2.volatility) / 1.0);
  
  const result = (base * 0.4) + (betaSim * 0.35) + (volSim * 0.25);
  return Number(Math.max(-0.99, Math.min(0.99, result)).toFixed(4));
};

export const calculateCovariance = (a1: Asset, a2: Asset): number => calculateCorrelation(a1, a2) * a1.volatility * a2.volatility * 10000;

/**
 * MATRIX UTILITIES for Quantitative Engines
 */
const matMul = (A: number[][], B: number[][]): number[][] => {
  const rows = A.length, cols = B[0].length, inner = B.length;
  const result = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++)
        result[i][j] += A[i][k] * B[k][j];
  return result;
};

const matVec = (M: number[][], v: number[]): number[] => {
  return M.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
};

const transpose = (M: number[][]): number[][] => {
  return M[0].map((_, j) => M.map(row => row[j]));
};

const matAdd = (A: number[][], B: number[][]): number[][] => {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
};

const matSub = (A: number[][], B: number[][]): number[][] => {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
};

const choleskyDecomposition = (matrix: number[][]): number[][] => {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const val = matrix[i][i] - sum;
        L[i][j] = Math.sqrt(Math.max(0, val));
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 1e-9);
      }
    }
  }
  return L;
};

const randn = (): number => {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1 || 1e-9)) * Math.cos(2.0 * Math.PI * u2);
};

/**
 * LAYER 1: KALMAN FILTER — Price Signal Cleaning
 * State vector: [price, velocity]
 */
export class KalmanFilterEngine {
  private x: number[];      // state [price, velocity]
  private P: number[][];    // state covariance
  private F: number[][];    // transition matrix
  private H: number[][];    // observation matrix
  private Q: number[][];    // process noise
  private R: number[][];    // observation noise

  constructor(initialPrice: number, processNoise = 0.001, obsNoise = 0.1) {
    this.x = [initialPrice, 0];
    this.P = [[1, 0], [0, 1]];
    this.F = [[1, 1], [0, 1]];
    this.H = [[1, 0]];
    
    const q = processNoise;
    this.Q = [
      [q * 0.25, q * 0.5],
      [q * 0.5,  q * 1.0]
    ];
    this.R = [[obsNoise]];
  }

  update(observation: number): { price: number; velocity: number; gain: number } {
    // PREDICT
    const xPred = matVec(this.F, this.x);
    const PPred = matAdd(
      matMul(matMul(this.F, this.P), transpose(this.F)),
      this.Q
    );

    // UPDATE
    const innovation = observation - matVec(this.H, xPred)[0];
    const S = matAdd(
      matMul(matMul(this.H, PPred), transpose(this.H)),
      this.R
    )[0][0];
    
    const K = PPred.map(row => [row[0] / (S || 1e-9)]);
    
    this.x = xPred.map((val, i) => val + K[i][0] * innovation);
    
    const KH = matMul(K, this.H);
    const I = [[1, 0], [0, 1]];
    const ImKH = matSub(I, KH);
    this.P = matMul(ImKH, PPred);

    return {
      price: this.x[0],
      velocity: this.x[1],
      gain: K[0][0]
    };
  }
}

/**
 * LAYER 2: GARCH(1,1) — Volatility Estimation via MLE (Refined Grid)
 */
export const estimateGARCH = (returns: number[]): { condVol: number[], forecast: number } => {
  const n = returns.length;
  if (n < 10) return { condVol: returns.map(() => 0), forecast: 0 };
  
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const demeaned = returns.map(r => r - mean);
  const sampleVar = demeaned.reduce((a, r) => a + r * r, 0) / n;

  // σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}
  let bestOmega = 0.00001;
  let bestAlpha = 0.1;
  let bestBeta = 0.85;
  let bestLL = -Infinity;

  // Refined Grid Search (~800 combinations)
  for (let a = 0.01; a <= 0.30; a += 0.01) {
    for (let b = 0.50; b <= 0.95; b += 0.01) {
      if (a + b >= 0.999) continue;
      const w = sampleVar * (1 - a - b);
      if (w <= 0) continue;
      
      let sigma2 = sampleVar;
      let ll = 0;
      for (let t = 1; t < n; t++) {
        sigma2 = w + a * demeaned[t-1] ** 2 + b * sigma2;
        ll += -0.5 * Math.log(2 * Math.PI) - 0.5 * Math.log(sigma2) - 0.5 * demeaned[t] ** 2 / (sigma2 || 1e-9);
      }
      
      if (ll > bestLL) {
        bestLL = ll;
        bestOmega = w;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  // Coordinate Descent Refinement
  let step = 0.005;
  for (let i = 0; i < 15; i++) {
    const candidates = [
      { a: bestAlpha + step, b: bestBeta },
      { a: bestAlpha - step, b: bestBeta },
      { a: bestAlpha, b: bestBeta + step },
      { a: bestAlpha, b: bestBeta - step }
    ];
    
    for (const cand of candidates) {
      if (cand.a <= 0 || cand.b <= 0 || cand.a + cand.b >= 0.999) continue;
      const w = sampleVar * (1 - cand.a - cand.b);
      let sigma2 = sampleVar;
      let ll = 0;
      for (let t = 1; t < n; t++) {
        sigma2 = w + cand.a * demeaned[t-1] ** 2 + cand.b * sigma2;
        ll += -0.5 * Math.log(2 * Math.PI) - 0.5 * Math.log(sigma2) - 0.5 * demeaned[t] ** 2 / (sigma2 || 1e-9);
      }
      if (ll > bestLL) {
        bestLL = ll;
        bestAlpha = cand.a;
        bestBeta = cand.b;
        bestOmega = w;
      }
    }
    step *= 0.8;
  }

  const condVol: number[] = [];
  let sigma2 = sampleVar;
  for (let t = 0; t < n; t++) {
    sigma2 = bestOmega + bestAlpha * (t > 0 ? demeaned[t-1] ** 2 : sampleVar) + bestBeta * sigma2;
    condVol.push(Math.sqrt(sigma2) * Math.sqrt(252));
  }
  
  const forecast = Math.sqrt(bestOmega + bestAlpha * demeaned[n-1] ** 2 + bestBeta * sigma2) * Math.sqrt(252);
  return { condVol, forecast };
};

/**
 * LAYER 3: HMM — Market Regime Detection (Baum-Welch Learning)
 */
interface HMMParams {
  pi: number[];
  A: number[][];
  mu: number[];
  sigma: number[];
}

const gaussianPDF = (x: number, mu: number, sigma: number): number => {
  return Math.exp(-0.5 * ((x - mu) / (sigma || 1e-9)) ** 2) / ((sigma || 1e-9) * Math.sqrt(2 * Math.PI));
};

const baumWelch = (returns: number[], K: number = 3, maxIter: number = 10): HMMParams => {
  const T = returns.length;
  const sorted = [...returns].sort((a, b) => a - b);
  
  // Initial parameters
  const params: HMMParams = {
    pi: Array(K).fill(1 / K),
    A: [
      [0.92, 0.05, 0.03],
      [0.05, 0.88, 0.07],
      [0.03, 0.07, 0.90]
    ],
    mu: [
      sorted[Math.floor(T * 0.75)] || 0.001,
      sorted[Math.floor(T * 0.50)] || 0.0,
      sorted[Math.floor(T * 0.25)] || -0.001
    ],
    sigma: [0.008, 0.015, 0.030]
  };

  for (let iter = 0; iter < maxIter; iter++) {
    // Forward
    const alpha: number[][] = Array.from({ length: T }, () => Array(K).fill(0));
    for (let j = 0; j < K; j++) alpha[0][j] = params.pi[j] * gaussianPDF(returns[0], params.mu[j], params.sigma[j]);
    let sum = alpha[0].reduce((a, b) => a + b, 0) || 1e-9;
    alpha[0] = alpha[0].map(v => v / sum);

    for (let t = 1; t < T; t++) {
      for (let j = 0; j < K; j++) {
        let s = 0;
        for (let i = 0; i < K; i++) s += alpha[t-1][i] * params.A[i][j];
        alpha[t][j] = s * gaussianPDF(returns[t], params.mu[j], params.sigma[j]);
      }
      sum = alpha[t].reduce((a, b) => a + b, 0) || 1e-9;
      alpha[t] = alpha[t].map(v => v / sum);
    }

    // Backward
    const beta: number[][] = Array.from({ length: T }, () => Array(K).fill(0));
    beta[T-1] = Array(K).fill(1 / K);
    for (let t = T - 2; t >= 0; t--) {
      for (let i = 0; i < K; i++) {
        let s = 0;
        for (let j = 0; j < K; j++) {
          s += params.A[i][j] * gaussianPDF(returns[t+1], params.mu[j], params.sigma[j]) * beta[t+1][j];
        }
        beta[t][i] = s;
      }
      sum = beta[t].reduce((a, b) => a + b, 0) || 1e-9;
      beta[t] = beta[t].map(v => v / sum);
    }

    // Posterior γ_t(i)
    const gamma: number[][] = Array.from({ length: T }, () => Array(K).fill(0));
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < K; i++) gamma[t][i] = alpha[t][i] * beta[t][i];
      sum = gamma[t].reduce((a, b) => a + b, 0) || 1e-9;
      gamma[t] = gamma[t].map(v => v / sum);
    }

    // M-step
    for (let j = 0; j < K; j++) {
      let sumG = 0, sumGR = 0, sumGR2 = 0;
      for (let t = 0; t < T; t++) {
        sumG += gamma[t][j];
        sumGR += gamma[t][j] * returns[t];
        sumGR2 += gamma[t][j] * returns[t] ** 2;
      }
      params.mu[j] = sumGR / (sumG || 1e-9);
      params.sigma[j] = Math.sqrt(Math.max(1e-8, sumGR2 / (sumG || 1e-9) - params.mu[j] ** 2));
    }
  }
  return params;
};

export const detectRegime = (prices: number[], vol: number[]): { 
  regime: string, 
  confidence: number,
  probabilities: { bull: number, neutral: number, bear: number }
} => {
  const returns = prices.slice(-60).map((p, i, arr) => i === 0 ? 0 : (p - arr[i-1])/arr[i-1]).slice(1);
  if (returns.length < 10) return { regime: 'SIDEWAYS', confidence: 0.5, probabilities: { bull: 0.33, neutral: 0.34, bear: 0.33 } };

  const params = baumWelch(returns, 3, 10);
  
  // Inference on last point
  const alpha: number[] = params.pi.map((p, j) => p * gaussianPDF(returns[returns.length-1], params.mu[j], params.sigma[j]));
  const sum = alpha.reduce((a, b) => a + b, 0) || 1e-9;
  const probs = alpha.map(v => v / sum);

  // Map states to Bull/Neutral/Bear based on mu
  const sortedIndices = [0, 1, 2].sort((a, b) => params.mu[b] - params.mu[a]);
  const bullIdx = sortedIndices[0];
  const neutralIdx = sortedIndices[1];
  const bearIdx = sortedIndices[2];

  const mappedProbs = {
    bull: probs[bullIdx],
    neutral: probs[neutralIdx],
    bear: probs[bearIdx]
  };

  const regimes = ['BULL', 'SIDEWAYS', 'BEAR'];
  const maxIdx = probs.indexOf(Math.max(...probs));
  let regime = 'SIDEWAYS';
  if (maxIdx === bullIdx) regime = 'BULL';
  else if (maxIdx === bearIdx) regime = 'BEAR';

  return { 
    regime, 
    confidence: probs[maxIdx],
    probabilities: mappedProbs
  };
};

/**
 * Aggregates portfolio factor loadings based on weighted asset characteristics.
 */
export const calculateFactorExposures = (assets: Asset[]): Factor[] => {
  if (assets.length === 0) {
    return [
      { name: 'Growth', value: 0 },
      { name: 'Value', value: 0 },
      { name: 'Momentum', value: 0 },
      { name: 'Quality', value: 0 },
      { name: 'Volatility', value: 0 }
    ];
  }

  const totalValue = assets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
  const weights = assets.map(a => (a.price * (a.quantity || 0)) / (totalValue || 1));

  // Growth: Based on Sector + Revenue Growth
  const growth = assets.reduce((acc, a, i) => {
    let score = a.sector === 'Technology' || a.sector === 'Crypto' ? 60 : 30;
    if (a.fundamentals?.revenueGrowth) score += a.fundamentals.revenueGrowth * 100;
    return acc + score * weights[i];
  }, 0);

  // Momentum: Based on RSI + Price vs SMA
  const momentum = assets.reduce((acc, a, i) => {
    const rsi = a.technicals?.rsi || 50;
    const smaDist = a.technicals?.sma50 ? (a.price / a.technicals.sma50 - 1) * 100 : 0;
    return acc + (rsi * 0.6 + (smaDist + 50) * 0.4) * weights[i];
  }, 0);

  // Volatility: Direct from asset volatility
  const volatility = assets.reduce((acc, a, i) => acc + (a.volatility * 100) * weights[i], 0);

  // Value: Based on P/E and P/B relative to market
  const value = assets.reduce((acc, a, i) => {
    const pe = a.fundamentals?.peRatio || 25;
    const pb = a.fundamentals?.pbRatio || 3;
    let score = 50;
    if (pe < 15) score += 20;
    if (pe > 40) score -= 20;
    if (pb < 1.5) score += 10;
    return acc + score * weights[i];
  }, 0);

  // Quality: Based on Debt/Equity and Margins
  const quality = assets.reduce((acc, a, i) => {
    const de = a.fundamentals?.debtToEquity || 1.0;
    let score = 70;
    if (de < 0.5) score += 15;
    if (de > 2.0) score -= 20;
    return acc + score * weights[i];
  }, 0);

  return [
    { name: 'Growth', value: Math.max(0, Math.min(100, growth)) },
    { name: 'Value', value: Math.max(0, Math.min(100, value)) },
    { name: 'Momentum', value: Math.max(0, Math.min(100, momentum)) },
    { name: 'Quality', value: Math.max(0, Math.min(100, quality)) },
    { name: 'Volatility', value: Math.max(0, Math.min(100, volatility)) }
  ];
};

/**
 * Resolves ticker to metadata within the universe or provides smart defaults.
 */
export const getAssetMetadata = (ticker: string) => {
  const asset = MARKET_UNIVERSE.find(a => a.ticker === ticker);
  if (asset) return asset;
  
  return {
    name: `${ticker} Equity`,
    beta: 1.15,
    volatility: 0.32,
    sector: 'Diversified Financials'
  };
};

/**
 * LAYER 4: ADVANCED QUANTITATIVE METRICS
 */

export const calculateKurtosis = (returns: number[]): { 
  kurtosis: number; 
  label: string;
  skewness: number;
} => {
  const n = returns.length;
  if (n < 4) return { kurtosis: 0, label: 'MESOKURTIC', skewness: 0 };

  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const m2 = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / n;
  const m3 = returns.reduce((a, r) => a + (r - mean) ** 3, 0) / n;
  const m4 = returns.reduce((a, r) => a + (r - mean) ** 4, 0) / n;

  const variance = m2;
  const std = Math.sqrt(variance);
  
  const skewness = std > 0 ? m3 / (std ** 3) : 0;
  const kurtosis = variance > 0 ? (m4 / (variance ** 2)) - 3 : 0; // excess kurtosis

  let label = 'MESOKURTIC';
  if (kurtosis > 1) label = 'LEPTOKURTIC';
  else if (kurtosis < -0.5) label = 'PLATYKURTIC';

  return { 
    kurtosis: Number(kurtosis.toFixed(3)), 
    label,
    skewness: Number(skewness.toFixed(3))
  };
};

export const calculateSignalStrength = (
  rawPrices: number[], 
  filteredPrices: number[], 
  velocities: number[]
): {
  snr: number;
  signalStrength: 'HIGH_CONVICTION' | 'MODERATE' | 'LOW_SIGNAL' | 'NOISE_DOMINANT';
  noiseScore: number;
} => {
  if (rawPrices.length < 10) return { snr: 0, signalStrength: 'LOW_SIGNAL', noiseScore: 0 };

  const noise = rawPrices.map((p, i) => p - filteredPrices[i]);
  const signalVar = filteredPrices.reduce((a, p, i, arr) => 
    i === 0 ? a : a + (p - arr[i - 1]) ** 2, 0
  ) / filteredPrices.length;
  const noiseVar = noise.reduce((a, n) => a + n ** 2, 0) / noise.length;

  const snr = noiseVar > 0 ? 10 * Math.log10(signalVar / noiseVar) : 20;
  const noiseScore = Math.min(100, Math.max(0, (noiseVar / (signalVar + noiseVar)) * 100));

  const recentVel = velocities.slice(-20);
  const posCount = recentVel.filter(v => v > 0).length;
  const consistency = Math.abs(posCount / (recentVel.length || 1) - 0.5) * 2;

  let signalStrength: 'HIGH_CONVICTION' | 'MODERATE' | 'LOW_SIGNAL' | 'NOISE_DOMINANT' = 'MODERATE';
  if (snr > 5 && consistency > 0.6) signalStrength = 'HIGH_CONVICTION';
  else if (snr > 0 && consistency > 0.3) signalStrength = 'MODERATE';
  else if (snr < -3) signalStrength = 'NOISE_DOMINANT';
  else signalStrength = 'LOW_SIGNAL';

  return {
    snr: Number(snr.toFixed(2)),
    signalStrength,
    noiseScore: Number(noiseScore.toFixed(1))
  };
};

export const calculateBreachRate = (
  returns: number[],
  var95: number
): { rate: number; label: string } => {
  if (returns.length < 5) return { rate: 0, label: 'N/A' };
  
  const breaches = returns.filter(r => r < -var95).length;
  const rate = (breaches / returns.length) * 100;

  let label = 'Healthy';
  if (rate > 8) label = 'Elevated';
  if (rate > 12) label = 'Critical';
  if (rate < 2) label = 'Conservative';

  return { rate: Number(rate.toFixed(1)), label };
};

/**
 * Calculates the Hurst Exponent to determine trend persistence vs mean reversion.
 * H < 0.5: Mean Reverting
 * H = 0.5: Random Walk
 * H > 0.5: Trending
 */
export const calculateHurstExponent = (prices: number[]): number => {
  const n = prices.length;
  if (n < 20) return 0.5;

  const returns = [];
  for (let i = 1; i < n; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const demeaned = returns.map(r => r - mean);
  
  const cumSum = [];
  let currentSum = 0;
  for (const val of demeaned) {
    currentSum += val;
    cumSum.push(currentSum);
  }

  const range = Math.max(...cumSum) - Math.min(...cumSum);
  const stdDev = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length);
  
  if (stdDev === 0) return 0.5;
  
  const rs = range / stdDev;
  const hurst = Math.log(rs) / Math.log(n);
  
  return Number(Math.max(0, Math.min(1, hurst)).toFixed(3));
};

/**
 * Calculates Z-Score of the current price relative to the Kalman-filtered state.
 */
export const calculateZScore = (raw: number, filtered: number, noiseVar: number): number => {
  const std = Math.sqrt(noiseVar);
  if (std === 0) return 0;
  return Number(((raw - filtered) / std).toFixed(2));
};

/**
 * LAYER 5: ADVANCED QUANTITATIVE METRICS
 * Implements specific formulas for Signal Matrix, Microstructure, and Scenarios.
 */

export const calculateSignalMatrix = (asset: Asset): { model: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; weight: number; confidence: number }[] => {
  const price = asset.price;
  const sma50 = asset.technicals?.sma50 || price;
  const sma200 = asset.technicals?.sma200 || price;
  const rsi = asset.technicals?.rsi || 50;
  const vol = asset.volatility;

  // 1. Mean Reversion: Buy if price is significantly below SMA50 (oversold)
  const distToSMA = (price - sma50) / sma50;
  let mrSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (distToSMA < -0.05) mrSignal = 'BUY';
  if (distToSMA > 0.05) mrSignal = 'SELL';
  
  // 2. Trend Following: Golden Cross logic
  let tfSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (price > sma50 && sma50 > sma200) tfSignal = 'BUY';
  if (price < sma50 && sma50 < sma200) tfSignal = 'SELL';

  // 3. Vol-Adjusted Momentum (Sharpe-like)
  // Simulating 20d return based on price and vol
  const momScore = (rsi - 50) / 100; // -0.5 to 0.5
  let vamSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (momScore > 0.1) vamSignal = 'BUY';
  if (momScore < -0.1) vamSignal = 'SELL';

  // 4. Institutional Flow (Volume Price Trend Proxy)
  // High volume on up days = Accumulation
  const volume = asset.technicals?.volume || 1000000;
  const flowScore = (volume > 50000000 && rsi > 50) ? 0.8 : 0.4;
  let flowSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (flowScore > 0.6) flowSignal = 'BUY';
  
  // 5. Sentiment Analysis (Derived from Volatility & RSI)
  // Low Vol + Rising RSI = Bullish Sentiment
  let sentSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (vol < 0.3 && rsi > 55) sentSignal = 'BUY';
  if (vol > 0.5 && rsi < 45) sentSignal = 'SELL';

  return [
    { model: 'Mean Reversion', signal: mrSignal, weight: 0.15, confidence: Math.abs(distToSMA) * 10 },
    { model: 'Trend Following', signal: tfSignal, weight: 0.30, confidence: 0.75 },
    { model: 'Vol-Adj Momentum', signal: vamSignal, weight: 0.20, confidence: 0.65 },
    { model: 'Institutional Flow', signal: flowSignal, weight: 0.25, confidence: flowScore },
    { model: 'Sentiment Analysis', signal: sentSignal, weight: 0.10, confidence: 0.60 }
  ];
};

export const calculateMarketMicrostructure = (asset: Asset) => {
  const price = asset.price;
  const vol = asset.volatility;
  const volume = asset.technicals?.volume || 1000000;

  // Order Flow Imbalance: (-1 to 1)
  // Simulated based on RSI skew. RSI > 50 implies buy pressure.
  const rsi = asset.technicals?.rsi || 50;
  const imbalance = (rsi - 50) / 50; 

  // Bid-Ask Spread:
  // Higher volatility usually means wider spreads.
  // Base spread 0.01% + Vol factor
  const spreadBps = 1 + (vol * 10); 
  let spreadDesc = "Tight";
  if (spreadBps > 5) spreadDesc = "Moderate";
  if (spreadBps > 15) spreadDesc = "Wide";

  // Dark Pool Activity:
  // High volume + Low price change = High Dark Pool
  const darkPoolScore = (volume > 100000000 && Math.abs(imbalance) < 0.2) ? 'HIGH' : 'MODERATE';

  return {
    orderFlowImbalance: Number(imbalance.toFixed(2)),
    bidAskSpread: spreadDesc,
    darkPoolActivity: darkPoolScore as 'HIGH' | 'MODERATE' | 'LOW',
    liquidityScore: Math.min(100, Math.max(0, Math.log10(volume) * 10))
  };
};

export const calculateRegimeProbability = (currentRegime: string) => {
  // Markov Transition Matrix (Hardcoded base probabilities)
  // Expansion tends to stay Expansion (0.8).
  // Contraction tends to stay Contraction (0.7).
  
  let matrix = {
    toExpansion: 0.1,
    toContraction: 0.1,
    toStagnation: 0.1,
    toRecovery: 0.1
  };

  if (currentRegime === 'EXPANSION' || currentRegime === 'BULL') {
    matrix = { toExpansion: 0.75, toContraction: 0.05, toStagnation: 0.15, toRecovery: 0.05 };
  } else if (currentRegime === 'CONTRACTION' || currentRegime === 'BEAR') {
    matrix = { toExpansion: 0.05, toContraction: 0.70, toStagnation: 0.10, toRecovery: 0.15 };
  } else {
    matrix = { toExpansion: 0.20, toContraction: 0.20, toStagnation: 0.50, toRecovery: 0.10 };
  }

  return {
    currentRegime: (currentRegime === 'BULL' ? 'EXPANSION' : currentRegime === 'BEAR' ? 'CONTRACTION' : 'STAGNATION') as any,
    transitionMatrix: matrix,
    forecastHorizon: '5 Days'
  };
};

export const calculateStrategicScenarios = (asset: Asset) => {
  const price = asset.price;
  const vol = asset.volatility; // Annualized
  const dailyVol = vol / Math.sqrt(252);
  const horizon = 30; // 30 days
  const drift = 0.05 / 252; // Daily drift

  // Projected move over horizon
  const move = dailyVol * Math.sqrt(horizon);
  
  const bullTarget = price * (1 + move + (drift * horizon));
  const bearTarget = price * (1 - move + (drift * horizon));
  const baseTarget = price * (1 + (drift * horizon));

  return {
    bull: { probability: 0.25, target: bullTarget.toFixed(2), catalyst: "Macro expansion & Multiple expansion" },
    base: { probability: 0.50, target: baseTarget.toFixed(2), catalyst: "Earnings stability" },
    bear: { probability: 0.25, target: bearTarget.toFixed(2), catalyst: "Rate hike shock or Recession" }
  };
};

export const calculateMacroPulse = (): { indicator: string; status: string; impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; explanation: string }[] => {
  return [
    { indicator: "Fed Policy", status: "RESTRICTIVE", impact: "BEARISH", explanation: "Rates held at 5.25-5.50%; market awaiting pivot signals." },
    { indicator: "Yield Curve", status: "INVERTED", impact: "BEARISH", explanation: "10Y-2Y spread remains inverted, though narrowing slightly." },
    { indicator: "S&P 500", status: "6,879.20", impact: "BULLISH", explanation: "Index trading near historical highs; SPY tracking at $687.92." },
    { indicator: "VIX Volatility", status: "19.86", impact: "NEUTRAL", explanation: "VIX near 20 suggests elevated but controlled market anxiety." }
  ];
};

export const calculateMarketNavigationSignals = (assets: Asset[]) => {
  return assets.map(asset => {
    const rsi = asset.technicals?.rsi || 50;
    const price = asset.price;
    const sma50 = asset.technicals?.sma50 || price;
    const sma200 = asset.technicals?.sma200 || price;
    
    let action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH' = 'HOLD';
    let reason = "Consolidating within neutral range.";
    let confidence = 0.5;

    if (rsi < 30) {
      action = 'BUY';
      reason = "RSI Oversold (Mean Reversion).";
      confidence = 0.85;
    } else if (rsi > 75) {
      action = 'SELL';
      reason = "RSI Overbought (Extension).";
      confidence = 0.85;
    } else if (price > sma50 && sma50 > sma200) {
      action = 'BUY';
      reason = "Golden Cross Trend Confirmation.";
      confidence = 0.75;
    } else if (price < sma50 && sma50 < sma200) {
      action = 'SELL';
      reason = "Death Cross Trend Breakdown.";
      confidence = 0.75;
    } else if (Math.abs((price - sma50)/sma50) < 0.02) {
      action = 'WATCH';
      reason = "Testing Key Moving Average Support.";
      confidence = 0.60;
    }

    return {
      ticker: asset.ticker,
      action,
      reason,
      confidence
    };
  });
};

/**
 * Generates a multi-path Monte Carlo simulation for the portfolio using Cholesky Decomposition.
 */
export const generateMonteCarloSimulation = (assets: Asset[], days: number = 252, pathsCount: number = 1000, drift: number = 0): MonteCarloResult => {
  const n = assets.length;
  if (n === 0) return { paths: [], stats: { meanFinalValue: 0, medianFinalValue: 0, p5: 0, p95: 0, probabilityOfLoss: 0 } };

  const totalValue = assets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0);
  const weights = assets.map(a => (a.price * (a.quantity || 0)) / (totalValue || 1));
  const mus = assets.map(a => ((a.fundamentals?.historicalReturn1y || 0.08) + drift * 0.05) / 252);
  const sigmas = assets.map(a => a.volatility / Math.sqrt(252));

  // Correlation Matrix
  const corrMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      corrMatrix[i][j] = calculateCorrelation(assets[i], assets[j]);
    }
  }

  const L = choleskyDecomposition(corrMatrix);
  const now = Date.now();
  const step = Math.max(1, Math.floor(days / 60)); // sample ~60 points for chart
  const paths: { date: string; [key: string]: number | string }[] = [];
  const finalValues: number[] = [];

  // Initialize paths
  for (let d = 0; d <= days; d += step) {
    const date = new Date(now + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    paths.push({ date });
  }

  // Limit displayed paths for performance
  const displayPaths = Math.min(pathsCount, 50);

  for (let p = 0; p < pathsCount; p++) {
    let currentPortfolioValue = 100;
    const assetValues = assets.map(() => 1.0);
    const pathKey = `path_${p}`;
    if (p < displayPaths) paths[0][pathKey] = 100;

    for (let d = 1; d <= days; d++) {
      const Z_ind = assets.map(() => randn());
      const Z_corr = matVec(L, Z_ind);

      let newPortfolioValue = 0;
      for (let i = 0; i < n; i++) {
        const driftTerm = mus[i] - 0.5 * sigmas[i] ** 2;
        const diffusionTerm = sigmas[i] * Z_corr[i];
        assetValues[i] *= Math.exp(driftTerm + diffusionTerm);
        newPortfolioValue += 100 * weights[i] * assetValues[i];
      }
      currentPortfolioValue = newPortfolioValue;

      if (p < displayPaths && d % step === 0) {
        const idx = d / step;
        if (idx < paths.length) paths[idx][pathKey] = Number(currentPortfolioValue.toFixed(2));
      }
    }
    finalValues.push(currentPortfolioValue);
  }

  finalValues.sort((a, b) => a - b);
  return {
    paths,
    stats: {
      meanFinalValue: finalValues.reduce((a, b) => a + b, 0) / finalValues.length,
      medianFinalValue: finalValues[Math.floor(finalValues.length / 2)],
      p5: finalValues[Math.floor(finalValues.length * 0.05)],
      p95: finalValues[Math.floor(finalValues.length * 0.95)],
      probabilityOfLoss: (finalValues.filter(v => v < 100).length / finalValues.length) * 100
    }
  };
};

/**
 * Calculates rolling portfolio risk metrics for historical visualization.
 */
export const calculateRollingPortfolioRisk = (assets: Asset[], days: number = 30) => {
  const data: { date: string; value: number; var95: number; cvar95: number; regime: 'HIGH_VOL' | 'NORMAL_VOL' | 'LOW_VOL'; breach: boolean }[] = [];
  const now = Date.now();
  const metrics = calculatePortfolioMetrics(assets);
  const baseVol = metrics.volatility / 100;
  const baseValue = assets.reduce((sum, a) => sum + (a.price * (a.quantity || 0)), 0) || 1000000;
  
  let currentValue = baseValue;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Simulate some volatility clustering
    const volMultiplier = 0.8 + Math.random() * 0.4;
    const currentVol = baseVol * volMultiplier;
    
    const dailyVol = currentVol / Math.sqrt(252);
    const var95 = currentValue * dailyVol * 1.645;
    const cvar95 = currentValue * dailyVol * 2.06;
    
    // Simulate a daily return
    const dailyReturn = (Math.random() - 0.5) * 2 * dailyVol;
    const actualChange = currentValue * dailyReturn;
    currentValue += actualChange;
    
    const breach = actualChange < -var95;
    
    let regime: 'HIGH_VOL' | 'NORMAL_VOL' | 'LOW_VOL' = 'NORMAL_VOL';
    if (currentVol > 0.35) regime = 'HIGH_VOL';
    else if (currentVol < 0.15) regime = 'LOW_VOL';
    
    data.push({
      date,
      value: Number(currentValue.toFixed(2)),
      var95: Number(var95.toFixed(2)),
      cvar95: Number(cvar95.toFixed(2)),
      regime,
      breach
    });
  }
  
  return data;
};
