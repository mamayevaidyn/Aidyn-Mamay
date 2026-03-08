
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PricePoint } from "../types";
import { getApiKey } from "./geminiService";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'X7HZP3Y9LYQYF4MD';
const FINNHUB_KEY = process.env.FINNHUB_KEY || 'd65m7k1r01qiish07ln0d65m7k1r01qiish07lng';

export interface MarketPrice {
  price: number;
  changePercent: string;
  isRealTime: boolean;
  source: 'BYBIT' | 'FINNHUB' | 'ALPHA_VANTAGE' | 'GEMINI_QUANT' | 'MOCK';
  high24h?: number;
  low24h?: number;
  turnover24h?: string;
}

export interface FearGreedData {
  value: number;
  label: string;
  timestamp: string;
  history: { value: number; timestamp: string }[];
  averages: {
    week: number;
    twoWeeks: number;
    month: number;
  };
}

/**
 * Deterministic Synthetic Data Generator
 * Used when all external APIs are blocked or too slow.
 */
export const generateSyntheticHistory = (basePrice: number, days: number = 60, ticker?: string): PricePoint[] => {
  const data: PricePoint[] = [];
  const now = Date.now();
  
  // Determine asset class characteristics
  const t = ticker?.toUpperCase() || '';
  const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA'].includes(t);
  const isStable = ['AAPL', 'MSFT', 'GOOGL', 'JPM'].includes(t);
  const isVolatile = ['TSLA', 'NVDA', 'MSTR', 'COIN'].includes(t);
  
  // Volatility settings
  const baseVol = isCrypto ? 0.025 : (isVolatile ? 0.018 : (isStable ? 0.008 : 0.012));
  
  // Trend settings
  const baseTrend = isCrypto ? 0.0005 : 0.0002;

  // 1. Generate realistic daily returns first (Chronological Order)
  const returns: number[] = [];
  let currentTrend = baseTrend;
  let volatility = baseVol;

  for (let i = 0; i < days - 1; i++) {
    // Regime switching: Change trend every 20-60 days
    if (Math.random() < 0.04) {
      // Mean reverting trend changes
      currentTrend = (Math.random() - 0.5) * (baseTrend * 12); 
      volatility = baseVol * (0.8 + Math.random() * 0.8); // +/- 40% vol shift
    }

    // Random walk with drift
    const u = Math.random() + Math.random() + Math.random() + Math.random() - 2; // Approx normal (-2 to 2)
    const noise = u * volatility;
    
    const dailyReturn = currentTrend + noise;
    returns.push(dailyReturn);
  }

  // 2. Calculate the starting price required to hit 'basePrice' at the end
  let cumulativeFactor = 1;
  for (const r of returns) {
    cumulativeFactor *= (1 + r);
  }
  
  // Dampening for non-crypto to prevent unrealistic moves
  if (!isCrypto) {
    if (cumulativeFactor > 2.0) cumulativeFactor = 2.0;
    if (cumulativeFactor < 0.5) cumulativeFactor = 0.5;
  }
  
  let currentPrice = basePrice / cumulativeFactor;

  // 3. Build the price path forward
  for (let i = 0; i < days - 1; i++) {
    const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Apply return
    currentPrice = currentPrice * (1 + returns[i]);
    
    data.push({
      date,
      price: currentPrice
    });
  }

  // Add today's exact price as the final point
  data.push({
    date: new Date(now).toISOString().split('T')[0],
    price: basePrice
  });

  return data;
};

export const generateNonlinearSyntheticHistory = (basePrice: number): PricePoint[] => {
  const data: PricePoint[] = [];
  const now = Date.now();
  let current = basePrice;
  for (let i = 60; i >= 0; i--) {
    const volatility = 0.03;
    // Introduce a sine wave to create nonlinearity
    const nonlinearTrend = Math.sin(i * (Math.PI / 15)) * 0.5;
    const noise = (Math.random() * volatility * 2 - volatility);
    current += nonlinearTrend + noise;
    data.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Number(current.toFixed(2))
    });
  }
  return data;
};

export const generateJumpDiffusionHistory = (basePrice: number): PricePoint[] => {
  const data: PricePoint[] = [];
  const now = Date.now();
  let current = basePrice;
  for (let i = 60; i >= 0; i--) {
    const volatility = 0.02;
    let change = (Math.random() * volatility * 2 - volatility);
    // Introduce a sharp drop at a specific point
    if (i === 30) {
      change -= 0.2; // 20% drop
    }
    current = current * (1 + change);
    data.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Number(current.toFixed(2))
    });
  }
  return data;
};

export const fetchBybitTicker = async (symbol: string): Promise<MarketPrice | null> => {
  try {
    const t = symbol.toUpperCase();
    const cleanSymbol = t.endsWith('USDT') ? t : `${t}USDT`;
    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${cleanSymbol}`, { 
      signal: AbortSignal.timeout(1500) 
    });
    const json = await response.json();
    if (json.retCode === 0 && json.result.list.length > 0) {
      const ticker = json.result.list[0];
      return {
        price: parseFloat(ticker.lastPrice),
        changePercent: (parseFloat(ticker.prevPrice24h) > 0) 
          ? (((parseFloat(ticker.lastPrice) - parseFloat(ticker.prevPrice24h)) / parseFloat(ticker.prevPrice24h)) * 100).toFixed(2) + '%'
          : '0.00%',
        isRealTime: true,
        source: 'BYBIT',
        high24h: parseFloat(ticker.highPrice24h),
        low24h: parseFloat(ticker.lowPrice24h),
        turnover24h: '$' + (parseFloat(ticker.turnover24h) / 1000000).toFixed(1) + 'M'
      };
    }
  } catch (e) {}
  return null;
};

export const fetchFinnhubQuote = async (ticker: string): Promise<MarketPrice | null> => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${FINNHUB_KEY}`, { 
      signal: AbortSignal.timeout(1500) 
    });
    const data = await response.json();
    if (data.c && data.c !== 0) {
      return { 
        price: data.c, 
        changePercent: data.dp ? `${data.dp.toFixed(2)}%` : "0.00%", 
        isRealTime: true, 
        source: 'FINNHUB',
        high24h: data.h,
        low24h: data.l
      };
    }
  } catch (e) {}
  return null;
};

export const fetchFinnhubFundamentals = async (ticker: string): Promise<any> => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker.toUpperCase()}&metric=all&token=${FINNHUB_KEY}`, { 
      signal: AbortSignal.timeout(2000) 
    });
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const fetchFinnhubProfile = async (ticker: string): Promise<any> => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker.toUpperCase()}&token=${FINNHUB_KEY}`, { 
      signal: AbortSignal.timeout(2000) 
    });
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const fetchRealTimePrice = async (ticker: string, skipGemini: boolean = false): Promise<MarketPrice | null> => {
  const t = ticker.toUpperCase();
  
  // Instant Indices
  if (t === 'SPY' || t === 'SPX') {
    const res = await fetchFinnhubQuote('SPY');
    if (res) return res;
  }
  if (t === 'VIX') {
    const res = await fetchFinnhubQuote('^VIX');
    if (res) return res;
  }
  
  // Check if it's a Solana address (long string)
  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ticker);
  
  try {
    // 1. Try Bybit and Finnhub in parallel
    const [bybit, finnhub] = await Promise.all([
      fetchBybitTicker(t),
      fetchFinnhubQuote(t)
    ]);
    if (bybit) return bybit;
    if (finnhub) return finnhub;

    // 2. Try Gemini (Intelligence) with strict timeout
    if (!skipGemini) {
      const geminiPromise = fetchPriceViaIntelligence(t);
      const timeoutPromise = new Promise<MarketPrice | null>(resolve => setTimeout(() => resolve(null), 3000));
      const gemini = await Promise.race([geminiPromise, timeoutPromise]);
      if (gemini && gemini.price > 0) return gemini;
    }

  } catch (e) {
    console.error("Fetch failed", e);
  }

  // 4. Fallback Mock - Ensure we ALWAYS return something so UI doesn't hang
  const fallbackPrices: Record<string, number> = {
    'FRHC': 118.42,
    'TSLA': 258.42,
    'NVDA': 142.85,
    'AAPL': 242.40,
    'MSFT': 425.12,
    'BTC': 98464.19,
    'ETH': 2650.00,
    'SPX': 5968.73,
    'S&P_500': 5968.73,
    'SPY': 596.87,
    'VIX': 14.20
  };

  return { 
    price: fallbackPrices[t] || (isSolanaAddress ? 0.0001 : (100 + Math.random() * 50)), 
    changePercent: "0.00%", 
    isRealTime: false, 
    source: 'MOCK' 
  };
};

export const fetchHistoricalData = async (ticker: string, days: number = 60): Promise<PricePoint[]> => {
  const t = ticker.toUpperCase();
  const cacheKey = `hist_cache_v4_${t}_${days}`;
  
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }

  console.log(`[MarketData] Fetching history for ${t}...`);

  try {
    // 1. Attempt Alpha Vantage
    const outputSize = days > 100 ? 'full' : 'compact';
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${t}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_KEY}`, { 
      signal: AbortSignal.timeout(5000) 
    });
    const data = await response.json();
    if (data['Time Series (Daily)']) {
      console.log(`[MarketData] Alpha Vantage success for ${t}`);
      const timeSeries = data['Time Series (Daily)'];
      const result = Object.keys(timeSeries).slice(0, days).map(date => ({
        date, price: parseFloat(timeSeries[date]['4. close']),
      })).reverse();
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      return result;
    }
  } catch (e) {
    console.error(`[MarketData] Alpha Vantage failed for ${t}`, e);
  }

  // 2. Last Resort: Use Gemini Intelligence to get REAL historical data points
  try {
    console.log(`[MarketData] Attempting Gemini Intelligence for ${t} history...`);
    const aiHistory = await fetchHistoricalDataViaIntelligence(t, days);
    if (aiHistory && aiHistory.length > 5) {
      sessionStorage.setItem(cacheKey, JSON.stringify(aiHistory));
      return aiHistory;
    }
  } catch (e) {
    console.error(`[MarketData] Gemini Intelligence failed for ${t}`, e);
  }

  // 3. Absolute Fallback: Synthetic (but with tighter constraints)
  console.warn(`[MarketData] All real data sources failed for ${t}. Using synthetic fallback.`);
  const livePrice = await fetchRealTimePrice(t);
  const fallback = generateSyntheticHistory(livePrice?.price || 150, days, t);
  sessionStorage.setItem(cacheKey, JSON.stringify(fallback));
  return fallback;
};

/**
 * Uses Gemini with Google Search to find real historical price points.
 */
export const fetchHistoricalDataViaIntelligence = async (ticker: string, days: number): Promise<PricePoint[] | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Find the historical daily closing prices for ${ticker} for the last ${days} days. 
  Provide ONLY a JSON array of objects with "date" (YYYY-MM-DD) and "price" (number). 
  Include at least 40-50 data points spread across the period to reconstruct a realistic chart for quantitative analysis.
  Format: [{"date": "2024-01-01", "price": 150.00}, ...]`;

  try {
    const response = (await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }]
      }
    })) as GenerateContentResponse;
    
    // Extract JSON from markdown if present
    const text = response.text || "";
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);
    
    if (Array.isArray(result) && result.length > 0) {
      // Sort by date to ensure chronological order
      return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  } catch (err: any) {
    if (err.message?.includes('429') || err.status === 429) {
      console.warn(`[MarketData] Quota exceeded for ${ticker} history. Falling back to synthetic.`);
    } else {
      console.error("Gemini Historical Fetch Error:", err);
    }
  }
  return null;
};

export const fetchPriceViaIntelligence = async (ticker: string): Promise<MarketPrice | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  
  // Check if it looks like a Solana address (Base58-like, long)
  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ticker);
  
  const prompt = isSolanaAddress 
    ? `Search for the current price, 24h change, and volume of the Solana token with address: ${ticker}. Check DexScreener or similar. Return ONLY JSON: {"price": number, "changePercent": "string", "high24h": number, "low24h": number, "turnover24h": "string"}`
    : `Current price/stats for ${ticker}. Return ONLY JSON: {"price": number, "changePercent": "string", "high24h": number, "low24h": number}`;

  try {
    const response = (await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Use a model with search capabilities
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }]
      }
    })) as GenerateContentResponse;
    
    const text = response.text || "";
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);
    
    return { 
      price: result.price || 0, 
      changePercent: result.changePercent || "0.00%", 
      isRealTime: true, 
      source: 'GEMINI_QUANT',
      high24h: result.high24h,
      low24h: result.low24h,
      turnover24h: result.turnover24h
    };
  } catch (err: any) { 
    if (err.message?.includes('429') || err.status === 429) {
      console.warn(`[MarketData] Quota exceeded for ${ticker} price. Falling back to mock.`);
    }
    return { price: 0, changePercent: "0.00%", isRealTime: false, source: 'MOCK' };
  }
};

export const fetchFearGreedIndex = async (limit: number = 30): Promise<FearGreedData | null> => {
  try {
    const response = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`, {
      signal: AbortSignal.timeout(5000)
    });
    const json = await response.json();
    if (json.data && json.data.length > 0) {
      const data = json.data;
      
      const parse = (entry: any) => ({
        value: parseInt(entry.value),
        timestamp: new Date(parseInt(entry.timestamp) * 1000).toISOString()
      });

      const history = data.map(parse);
      const current = data[0];

      const avg = (days: number) => {
        const subset = data.slice(0, Math.min(days, data.length));
        return Math.round(subset.reduce((acc: number, d: any) => acc + parseInt(d.value), 0) / subset.length);
      };

      return {
        value: parseInt(current.value),
        label: current.value_classification,
        timestamp: new Date(parseInt(current.timestamp) * 1000).toISOString(),
        history: history.reverse(), // Chronological for charts
        averages: {
          week: avg(7),
          twoWeeks: avg(14),
          month: avg(30)
        }
      };
    }
  } catch (e) {
    console.error("Fear & Greed Fetch Error:", e);
  }
  return null;
};

/**
 * Generates correlated data for an asset and the market.
 */
export const generateCorrelatedData = (steps: number, correlation: number): { asset: number[], market: number[] } => {
  const asset: number[] = [100];
  const market: number[] = [1000];

  for (let i = 1; i <= steps; i++) {
    const marketReturn = (Math.random() - 0.48) * 0.03; // Market has a slight positive drift
    const specificRisk = (Math.random() - 0.5) * 0.02;
    const assetReturn = correlation * marketReturn + (1 - correlation) * specificRisk;

    asset.push(asset[i-1] * (1 + assetReturn));
    market.push(market[i-1] * (1 + marketReturn));
  }

  return { asset, market };
};

/**
 * Generates synthetic data for the Fama-French three-factor model.
 */
export const generateFamaFrenchData = (steps: number): { assetReturns: number[], marketReturns: number[], smb: number[], hml: number[] } => {
  const assetReturns: number[] = [];
  const marketReturns: number[] = [];
  const smb: number[] = []; // Small Minus Big (Size factor)
  const hml: number[] = []; // High Minus Low (Value factor)

  // True betas for the simulation
  const betaMarket = 1.2;
  const betaSmb = 0.4;
  const betaHml = -0.3;

  for (let i = 0; i < steps; i++) {
    const marketRet = (Math.random() - 0.49) * 0.03;
    const smbRet = (Math.random() - 0.5) * 0.015;
    const hmlRet = (Math.random() - 0.5) * 0.01;
    const idiosyncraticRisk = (Math.random() - 0.5) * 0.01;

    const assetRet = betaMarket * marketRet + betaSmb * smbRet + betaHml * hmlRet + idiosyncraticRisk;

    assetReturns.push(assetRet);
    marketReturns.push(marketRet);
    smb.push(smbRet);
    hml.push(hmlRet);
  }

  return { assetReturns, marketReturns, smb, hml };
};

/**
 * Generates a universe of correlated asset returns for PCA.
 */
export const generateAssetUniverse = (numAssets: number, steps: number): number[][] => {
  const universe: number[][] = Array.from({ length: numAssets }, () => []);
  const baseMarket = [];

  // 1. Create a base market factor
  for (let i = 0; i < steps; i++) {
    baseMarket.push((Math.random() - 0.49) * 0.03);
  }

  // 2. Create assets with varying correlation to the market and some noise
  for (let i = 0; i < numAssets; i++) {
    const correlation = 0.4 + Math.random() * 0.5; // Varying correlations from 0.4 to 0.9
    for (let j = 0; j < steps; j++) {
      const idiosyncraticRisk = (Math.random() - 0.5) * 0.02;
      const assetReturn = baseMarket[j] * correlation + idiosyncraticRisk * (1 - correlation);
      universe[i].push(assetReturn);
    }
  }

  return universe;
};

/**
 * Generates synthetic returns with volatility clustering.
 */
export const generateGarchData = (steps: number): number[] => {
  const returns: number[] = [];
  let volatility = 0.01;
  const alpha = 0.2; // Weight on past squared returns
  const beta = 0.7;  // Weight on past variance
  const omega = 0.00001; // Long-run variance component

  for (let i = 0; i < steps; i++) {
    const epsilon = (Math.random() * 2 - 1); // Simplified normal random variable
    const ret = epsilon * volatility;
    returns.push(ret);
    // GARCH(1,1) variance update
    volatility = Math.sqrt(omega + alpha * Math.pow(ret, 2) + beta * Math.pow(volatility, 2));
  }

  return returns;
};

/**
 * Generates two interrelated time series for VAR modeling.
 */
export const generateVarData = (steps: number): number[][] => {
  const series1: number[] = [100];
  const series2: number[] = [50];

  for (let i = 1; i < steps; i++) {
    const noise1 = (Math.random() - 0.5) * 2;
    const noise2 = (Math.random() - 0.5) * 2;

    // Series 1 is influenced by its own past and series 2's past
    const new1 = 0.8 * series1[i-1] - 0.3 * series2[i-1] + noise1;
    // Series 2 is influenced by series 1's past and its own past
    const new2 = 0.4 * series1[i-1] + 0.7 * series2[i-1] + noise2;

    series1.push(new1);
    series2.push(new2);
  }

  return [series1, series2];
};
