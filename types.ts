
export interface Technicals {
  rsi: number;
  sma50: number;
  sma200: number;
  volume: number;
}

export interface KeyFacts {
  exchange: string;
  netAssets?: string;
  sharesOutstanding?: string;
  inceptionDate?: string;
  cusip?: string;
  expenseRatio?: string;
  dividendFrequency?: string;
  beta3y?: number;
  stdDev3y?: string;
  peRatio?: number;
  pbRatio?: number;
  fcf?: number;
  wacc?: number;
  terminalGrowth?: number;
  beta?: number;
  eps?: number;
  bookValue?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  historicalReturn1y?: number;
}

export interface DeepResearch {
  ticker: string;
  currentPrice: number;
  marketCap: string;
  summary: string[]; // Updated to string[]
  annualResults: any[];
  catalysts: string[];
  institutionalSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  socialSentiment?: {
    x: { score: number; sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' };
    reddit: { score: number; sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' };
  };
  recommendation?: 'BUY' | 'STRONG_BUY' | 'SELL' | 'STRONG_SELL' | 'HOLD';
  aiConvictionScore?: number;
  priceTarget?: {
    low: number;
    median: number;
    high: number;
  };
  competitors?: {
    ticker: string;
    name: string;
    marketCap: string;
    price?: string; // Added
    perf?: string; // Added
  }[];
  news?: {
    title: string;
    url: string;
    source: string;
    date: string;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  }[];
  shareholders?: {
    name: string;
    shares: string;
    value: string;
    change: string;
  }[];
  insiderActivity?: {
    name: string;
    role: string;
    type: 'BUY' | 'SELL';
    amount: string;
    date: string;
  }[];
  upcomingEvents?: {
    event: string;
    date: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  analystRatings?: {
    consensus: 'BUY' | 'SELL' | 'HOLD' | 'OUTPERFORM' | 'UNDERPERFORM';
    targetPrice: number;
    firmCount: number;
  };
  revenueTrends?: {
    period: string;
    revenue: string;
    growth: string;
  }[];
  quantMetrics?: {
    fcf: number;
    wacc: number;
    beta: number;
    eps: number;
    bvps: number;
    historicalReturn1y: number;
    marketReturn1y: number;
    riskFreeRate: number;
  };
  keyFacts?: KeyFacts;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'ASK' | 'BID';
}

// Added missing MarketRegime enum
export enum MarketRegime {
  CONTRACTION = 'CONTRACTION',
  TRANSITIONAL = 'TRANSITIONAL',
  EXPANSION = 'EXPANSION'
}

// Added missing RiskMetrics interface
export interface RiskMetrics {
  var95: number;
  expectedShortfall: number;
  diversificationScore: number;
  volatility: number;
  beta: number;
  alpha: number;
  systemicRisk: number;
  dailyChange: number;
  sharpeRatio: number;
  kurtosis?: number;
  skewness?: number;
  kurtosisLabel?: string;
  signalStrength?: 'HIGH_CONVICTION' | 'MODERATE' | 'LOW_SIGNAL' | 'NOISE_DOMINANT';
  snr?: number;
  noiseScore?: number;
  breachRate?: number;
  breachLabel?: string;
  regimeConfidence?: number;
  regimeProbs?: { bull: number, neutral: number, bear: number };
}

// Added missing MarketSnapshot interface
export interface MarketSnapshot {
  spy: number;
  qqq: number;
  vix: number;
  yield10y: number;
  topGainer: string;
  topLoser: string;
}

// Added missing PricePoint interface
export interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

// Added missing Factor interface
export interface Factor {
  name: string;
  value: number;
}

// Added missing Valuation interface
export interface Valuation {
  intrinsicValue: number;
  marginOfSafety: number;
  rating: 'FAIR' | 'UNDERVALUED' | 'OVERVALUED' | 'N/A';
  method: string;
}

// Added missing Projection interface
export interface Projection {
  targetPrice: number;
  probability: number;
  timeframe: string;
  reasoning: string;
}

// Updated Asset interface with missing properties
export interface Asset {
  ticker: string;
  name: string;
  weight: number;
  price: number;
  avgBuyPrice?: number;
  beta: number;
  volatility: number;
  sector: string;
  lastChange?: number;
  quantity?: number;
  account?: string;
  purchaseDate?: string;
  country?: string;
  marketValue?: number;
  pl1d?: number;
  technicals?: Technicals;
  fundamentals?: any;
  isCustom?: boolean;
  isLive?: boolean;
  history?: PricePoint[];
  valuation?: Valuation;
  projection?: Projection;
  metrics?: {
    sharpeRatio: number;
    [key: string]: any;
  };
}

// Updated PortfolioState interface with required properties
export interface PortfolioState {
  assets: Asset[];
  totalValue: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BTC'; // Added currency support
  metrics: RiskMetrics;
  factors: Factor[];
  regime: MarketRegime;
  market: MarketSnapshot;
  pcaData: any[];
  recommendations: any[];
  riskContributions?: { ticker: string; percentage: number }[];
  correlationMatrix?: { tickers: string[]; matrix: number[][] };
}

export interface MonteCarloResult {
  paths: { date: string; [key: string]: number | string }[];
  stats: {
    meanFinalValue: number;
    medianFinalValue: number;
    p5: number;
    p95: number;
    probabilityOfLoss: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  region: 'WEST' | 'EAST' | 'GLOBAL';
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impactExplanation: string;
  impactScore: number;
  image?: string;
  sourceType: string;
  isMock?: boolean;
}

export type NewsRegion = 'WEST' | 'EAST' | 'GLOBAL';

export interface SimulationData {
  kfData: {raw: PricePoint[], filtered: PricePoint[]};
  ekfData: {raw: PricePoint[], filtered: PricePoint[]};
  ukfData: {raw: PricePoint[], filtered: PricePoint[]};
  pfData: {raw: PricePoint[], filtered: PricePoint[]};
  gbmData: PricePoint[][];
  ouData: PricePoint[];
  hestonData: PricePoint[];
  capmData: {assetReturns: number[], marketReturns: number[], beta: number};
  famaFrenchData: {betas: number[]};
  aptData: {explainedVariance: number[]};
  garchData: {returns: number[], conditionalVolatility: number[]};
  varData: {series: number[][], forecasts: number[][]};
  mcPaths: PricePoint[][];
  lastUpdated: number;
}
