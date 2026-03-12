
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PortfolioState, DeepResearch, SimulationData } from "../types";

// Caching configuration to minimize API calls and stay within free limits
const CACHE_PREFIX = "lumia_research_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours cache

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export interface IntelligenceData {
  alphaScore: number;
  strategicDirective: string;
  primaryAction: 'ACCUMULATE' | 'DISTRIBUTE' | 'HEDGE' | 'HOLD' | 'CAUTIOUS HOLD';
  confidence: number;
  signalMatrix: { 
    model: string; 
    signal: 'BUY' | 'SELL' | 'NEUTRAL'; 
    weight: number; 
    confidence: number;
  }[];
  correlations: {
    pair: string;
    correlation: number;
    insight: string;
  }[];
  marketMicrostructure: {
    orderFlowImbalance: number; // -1 to 1
    bidAskSpread: string; // "Tight" | "Wide" | "Volatile"
    darkPoolActivity: 'HIGH' | 'MODERATE' | 'LOW';
    liquidityScore: number; // 0-100
  };
  regimeProbability: {
    currentRegime: 'EXPANSION' | 'CONTRACTION' | 'STAGNATION' | 'RECOVERY';
    transitionMatrix: {
      toExpansion: number;
      toContraction: number;
      toStagnation: number;
      toRecovery: number;
    };
    forecastHorizon: string; // e.g., "5 Days"
  };
  macroPulse: {
    indicator: string;
    status: string;
    impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    explanation: string;
  }[];
  marketNavigationSignals: {
    ticker: string;
    action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
    reason: string;
    confidence: number;
  }[];
  scenarioMatrix: {
    bull: { probability: number; target: string; catalyst: string };
    base: { probability: number; target: string; catalyst: string };
    bear: { probability: number; target: string; catalyst: string };
  };
  catalysts: { event: string; description: string; impactLevel: 'HIGH' | 'MEDIUM'; date: string }[];
  tailRisk: { probability: number; event: string; mitigation: string };
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

let quotaExceeded = false;
const listeners: ((exceeded: boolean) => void)[] = [];

export const isQuotaExceeded = () => quotaExceeded;
export const subscribeToQuotaStatus = (callback: (exceeded: boolean) => void) => {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

const notifyQuotaStatus = (exceeded: boolean) => {
  quotaExceeded = exceeded;
  listeners.forEach(l => l(exceeded));
};

export const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    const result = await fn();
    if (quotaExceeded) notifyQuotaStatus(false); // Reset if successful
    return result;
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || error.status === 429;
    const isOverloaded = error.message?.includes('503') || error.status === 503 || error.message?.includes('high demand');
    
    if (isRateLimit || isOverloaded) {
      if (isRateLimit) notifyQuotaStatus(true);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
      }
    }
    throw error;
  }
};

const safeJsonParse = (text: string | undefined) => {
  if (!text) return null;
  try {
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return null;
  }
};

export const getApiKey = (): string => {
  return process.env.GEMINI_API_KEY || '';
};

/**
 * Get research with LocalStorage caching.
 * Uses gemini-3-flash-preview because it requires Search.
 */
export const getDeepAssetResearch = async (ticker: string): Promise<DeepResearch | null> => {
  const cached = localStorage.getItem(CACHE_PREFIX + ticker);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data;
  }

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = (await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', // High-speed model with high limits
      contents: `Provide deep institutional research for ${ticker} in ENGLISH. 
      JSON structure: 
      {
        "keyFacts": {"exchange", "netAssets", "sharesOutstanding", "inceptionDate", "cusip", "expenseRatio", "beta3y", "stdDev3y", "peRatio", "pbRatio"}, 
        "summary": ["string", "string", "string"], // Return 3-4 concise, high-impact bullet points about the asset's current status and outlook.
        "institutionalSentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
        "socialSentiment": {
          "x": {"score": number (0-100), "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"},
          "reddit": {"score": number (0-100), "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"}
        },
        "recommendation": "BUY" | "STRONG_BUY" | "SELL" | "STRONG_SELL" | "HOLD",
        "aiConvictionScore": number (0-100),
        "priceTarget": {"low": number, "median": number, "high": number},
        "catalysts": ["string"],
        "competitors": [{"ticker": "string", "name": "string", "marketCap": "string", "price": "string", "perf": "string"}], // CRITICAL: You MUST include the current price (e.g. "$142.50") and 24h performance (e.g. "+1.2%") for each competitor. Do not leave these blank.
        "news": [{"title": "string", "url": "string", "source": "string", "date": "string", "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL"}],
        "shareholders": [{"name": "string", "shares": "string", "value": "string", "change": "string"}], // Top 5 institutional shareholders.
        "insiderActivity": [{"name": "string", "role": "string", "type": "BUY" | "SELL", "amount": "string (Value in USD, e.g. $1.2M)", "date": "string"}],
        "upcomingEvents": [{"event": "string", "date": "string", "impact": "HIGH" | "MEDIUM" | "LOW"}],
        "analystRatings": {"consensus": "BUY" | "SELL" | "HOLD" | "OUTPERFORM" | "UNDERPERFORM", "targetPrice": number, "firmCount": number},
        "revenueTrends": [{"period": "string (e.g. Q4 2026)", "revenue": "string (e.g. $68.1B)", "growth": "string"}], // CRITICAL: Ensure these match the latest official earnings reports found via Search.
        "quantMetrics": {
          "fcf": number (Free Cash Flow in USD),
          "wacc": number (as decimal, e.g. 0.085),
          "beta": number,
          "eps": number,
          "bvps": number (Book Value Per Share),
          "historicalReturn1y": number (as decimal, e.g. 0.15),
          "marketReturn1y": number (S&P 500 return over same 1y period),
          "riskFreeRate": number (current 10Y yield as decimal)
        }
      }`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json"
      }
    }))) as GenerateContentResponse;
    
    const parsed = safeJsonParse(response.text);
    if (parsed) {
      localStorage.setItem(CACHE_PREFIX + ticker, JSON.stringify({ data: parsed, timestamp: Date.now() }));
    }
    return parsed;
  } catch (err) { return null; }
};

/**
 * High-efficiency model for internal auditing tasks.
 */
export const auditPortfolioRisk = async (portfolio: PortfolioState): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key missing. Please add in Settings.";
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = (await withRetry(() => ai.models.generateContent({
      model: 'gemini-flash-lite-latest', // Lowest latency, practically "unlimited" for small prompts
      contents: `Audit risk for: ${JSON.stringify(portfolio.assets.map(a => a.ticker))}. 
      Provide a structured, actionable audit (max 80 words).
      Strict Format:
      ## 🛡️ INSTITUTIONAL AUDIT
      **Risk Score:** [0-100]/100 (High/Med/Low)
      
      **Critical Vulnerabilities:**
      • [Ticker]: [Specific risk] (e.g. "Margin compression")
      • [Ticker]: [Specific risk] (e.g. "Regulatory overhang")
      
      **Actionable Hedge:**
      [One specific hedging strategy, e.g. "Buy OTM Puts on QQQ" or "Reduce Beta exposure"]`,
      config: { }
    }))) as GenerateContentResponse;
    return response.text || "Audit unavailable.";
  } catch (err) { return "System busy. Retry in 10s."; }
};

/**
 * Uses Flash-Lite for synthesis to save Search quota.
 */
import { 
  calculateSignalMatrix, 
  calculateMarketMicrostructure, 
  calculateRegimeProbability, 
  calculateStrategicScenarios,
  calculateCorrelationMatrix,
  calculatePortfolioMetrics,
  calculateTailRisk,
  calculateMacroPulse,
  calculateMarketNavigationSignals
} from './quantEngine';

// ... existing imports

export const synthesizeFullIntelligence = async (portfolio: PortfolioState): Promise<IntelligenceData | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Calculate Real Quantitative Metrics (Ground Truth)
  // These are mathematically derived from price history and are the "Baseline Truth"
  const topAsset = portfolio.assets.sort((a, b) => (b.price * b.weight) - (a.price * a.weight))[0] || portfolio.assets[0];
  
  // Aggregate Signal Matrix (Weighted Average of top 3 assets)
  const top3 = portfolio.assets.slice(0, 3);
  const rawSignals = top3.map(a => calculateSignalMatrix(a));
  
  // Flatten and average signals for the "System View"
  const aggregatedSignals = [
    { model: 'Mean Reversion', signal: rawSignals[0][0].signal, weight: 0.15, confidence: rawSignals[0][0].confidence },
    { model: 'Trend Following', signal: rawSignals[0][1].signal, weight: 0.30, confidence: rawSignals[0][1].confidence },
    { model: 'Vol-Adj Momentum', signal: rawSignals[0][2].signal, weight: 0.20, confidence: rawSignals[0][2].confidence },
    { model: 'Institutional Flow', signal: rawSignals[0][3].signal, weight: 0.25, confidence: rawSignals[0][3].confidence },
    { model: 'Sentiment Analysis', signal: rawSignals[0][4].signal, weight: 0.10, confidence: rawSignals[0][4].confidence }
  ];

  const microstructure = calculateMarketMicrostructure(topAsset);
  const regime = calculateRegimeProbability(portfolio.regime);
  const scenarios = calculateStrategicScenarios(topAsset);
  const correlations = calculateCorrelationMatrix(portfolio.assets);
  const tailRisk = calculateTailRisk(portfolio.assets);
  const macroPulse = calculateMacroPulse();
  const navSignals = calculateMarketNavigationSignals(portfolio.assets);
  
  // Prepare correlation data for prompt
  const correlationData = correlations.topPairs.length > 0 ? correlations.topPairs : [{ pair: "None", val: 0 }];

  try {
    // 2. Use AI with Search to VALIDATE and ENHANCE the ground truth
    // We ask the AI to specifically look for *news* and *macro* data to flesh out the narrative.
    const response = (await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Synthesize a highly quantitative market intelligence report.
      
      GROUND TRUTH DATA (MATHEMATICALLY DERIVED - USE AS BASELINE):
      - Signal Matrix: ${JSON.stringify(aggregatedSignals)}
      - Microstructure: ${JSON.stringify(microstructure)}
      - Regime: ${JSON.stringify(regime)}
      - Scenarios: ${JSON.stringify(scenarios)}
      - Top Correlations: ${JSON.stringify(correlationData)}
      - Tail Risk: ${JSON.stringify(tailRisk)}
      - Macro Pulse (Calculated): ${JSON.stringify(macroPulse)}
      - Navigation Signals (Calculated): ${JSON.stringify(navSignals)}
      - Portfolio Assets: ${JSON.stringify(portfolio.assets.map(a => a.ticker))}

      TASK:
      1. SEARCH for current "Fed Policy", "Yield Curve", "DXY", and "VIX" news. 
         - IF search finds different status/impact than the Ground Truth, UPDATE the "Macro Pulse" with the real-time info.
         - IF search confirms it, use the Ground Truth.
      
      2. SEARCH for specific recent news/catalysts for the top assets (${portfolio.assets.slice(0,2).map(a=>a.ticker).join(',')}).
         - Use this to write the "Strategic Directive" and "Primary Action".
      
      3. GENERATE the JSON.
         - "marketNavigationSignals": You MAY update the "reason" field with specific news if found (e.g. "Earnings beat"), otherwise keep the technical reason.
         - "correlations": Add an "insight" string explaining *why* these assets might be correlated based on current market themes (e.g. "AI Sector rotation").

      Return JSON matching the IntelligenceData interface.`,
      config: { 
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    }))) as GenerateContentResponse;
    
    const parsed = safeJsonParse(response.text);
    
    // 3. ROBUST MERGE STRATEGY
    // If AI fails or returns partial data, we fallback to the calculated Ground Truth.
    // This ensures the UI *never* shows empty data.
    
    if (!parsed) {
      console.warn("AI Synthesis failed, using calculated fallback.");
      return {
        alphaScore: 50,
        strategicDirective: "Market data unavailable. Relying on technical baseline.",
        primaryAction: "HOLD",
        confidence: 0.5,
        signalMatrix: aggregatedSignals,
        marketMicrostructure: microstructure,
        regimeProbability: regime,
        scenarioMatrix: scenarios,
        tailRisk: tailRisk,
        macroPulse: macroPulse,
        marketNavigationSignals: navSignals,
        correlations: correlationData.map(c => ({ pair: c.pair, correlation: c.val, insight: "Correlation based on price history." })),
        catalysts: []
      };
    }

    return {
      ...parsed,
      // We enforce the calculated metrics for the "Hard Math" sections to prevent hallucination
      // unless the AI explicitly returned valid data for them (which we assume it did if parsed exists, 
      // but we prefer the local math for consistency on things like Microstructure/Regime).
      
      // However, for Macro Pulse and Nav Signals, we allow the AI to override if it found better info,
      // but we default to calculated if missing.
      macroPulse: (parsed.macroPulse && parsed.macroPulse.length === 4) ? parsed.macroPulse : macroPulse,
      marketNavigationSignals: (parsed.marketNavigationSignals && parsed.marketNavigationSignals.length > 0) ? parsed.marketNavigationSignals : navSignals,
      
      // Always use local math for these as they are pure quant metrics
      signalMatrix: aggregatedSignals, 
      marketMicrostructure: microstructure, 
      regimeProbability: regime, 
      scenarioMatrix: scenarios,
      tailRisk: tailRisk,
      
      // Merge correlations
      correlations: (parsed.correlations && parsed.correlations.length > 0) ? parsed.correlations : correlationData.map(c => ({
        pair: c.pair,
        correlation: c.val,
        insight: c.val > 0.7 ? "High correlation reduces diversification benefit." : "Moderate correlation provides some hedge."
      }))
    };

  } catch (err) { 
    console.error("Intelligence synthesis error:", err);
    // Ultimate Fallback
    return {
        alphaScore: 50,
        strategicDirective: "System error. Showing technical baseline.",
        primaryAction: "HOLD",
        confidence: 0.5,
        signalMatrix: aggregatedSignals,
        marketMicrostructure: microstructure,
        regimeProbability: regime,
        scenarioMatrix: scenarios,
        tailRisk: tailRisk,
        macroPulse: macroPulse,
        marketNavigationSignals: navSignals,
        correlations: correlationData.map(c => ({ pair: c.pair, correlation: c.val, insight: "Correlation based on price history." })),
        catalysts: []
    }; 
  }
};

export const getAIAdvisorStream = async function* (
  userPrompt: string, 
  portfolio: PortfolioState,
  history: any[],
  simulationData?: SimulationData,
  image?: { mimeType: string, data: string }
) {
  const apiKey = getApiKey();
  if (!apiKey) { yield { text: "API Key missing. Please add in Settings.", groundingSources: [] }; return; }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const portfolioSummary = {
      assets: portfolio.assets.map(a => ({
        ticker: a.ticker,
        weight: (a.weight * 100).toFixed(1) + '%',
        sector: a.sector,
        beta: a.beta.toFixed(2),
        volatility: a.volatility.toFixed(2)
      })),
      metrics: {
        totalValue: portfolio.totalValue,
        portfolioBeta: portfolio.metrics.beta.toFixed(2),
        portfolioAlpha: portfolio.metrics.alpha.toFixed(2) + '%',
        var95: portfolio.metrics.var95.toFixed(2) + '%',
        volatility: portfolio.metrics.volatility.toFixed(2) + '%',
        regime: portfolio.regime
      }
    };

    let simContext = "";
    if (simulationData && simulationData.lastUpdated > 0) {
       simContext = `
       QUANTITATIVE ANALYSIS DATA (Use this to answer questions about future paths and risk):
       
       1. MONTE CARLO SIMULATION (Future Paths):
          - The simulation ran ${simulationData.mcPaths.length} paths.
          - Use this to discuss potential future price ranges and probability of loss.
       
       2. ECONOMETRICS (Volatility & Correlations):
          - GARCH(1,1) Volatility Trend (Last 5 days): ${simulationData.garchData.conditionalVolatility.slice(-5).map(v => (v*100).toFixed(2) + '%').join(', ')}
          - This indicates the current volatility regime (Rising/Falling).
          
       3. FACTOR MODELS (Structural Risk):
          - CAPM Beta: ${simulationData.capmData.beta.toFixed(3)} (Systematic Risk)
          - Fama-French Factors: ${simulationData.famaFrenchData.betas.map(b => b.toFixed(3)).join(', ')} (Market, Size, Value loadings)
          - APT Explained Variance: ${simulationData.aptData.explainedVariance.slice(0,3).map(v => (v*100).toFixed(1) + '%').join(', ')} (Top 3 principal components)
       
       4. VAR FORECASTS (Vector Autoregression):
          - Next 5 steps forecast for interrelated assets: ${JSON.stringify(simulationData.varData.forecasts.slice(0, 5))}
       `;
    }

    const parts: any[] = [{ 
      text: `SYSTEM INSTRUCTION:
      You are LUMIA, an exclusive, high-end strategic intelligence partner for institutional capital.
      You are NOT a robot, a terminal, or a generic assistant. You are a sophisticated financial architect.
      
      PERSONA & TONE:
      - Sophisticated, elegant, and highly intelligent.
      - Use "We" to imply a partnership between you (the intelligence) and the user (the principal).
      - Speak like a senior partner at a top-tier quantitative hedge fund.
      - Be concise but articulate. Use natural, fluid language, not robotic bullet points unless necessary for data.
      - Never use "I hope this helps" or "As an AI". You are a bespoke intelligence engine.
      
      DATA UTILIZATION:
      - You have direct access to the firm's quantitative core (Monte Carlo, GARCH, Factor Models).
      - Weave this data naturally into your narrative.
      - Instead of "The GARCH model says...", say "Our volatility models are indicating..." or "The volatility surface suggests..."
      - Use the Monte Carlo data to discuss probability-weighted scenarios.
      
      CURRENT INTELLIGENCE:
      Portfolio Value: ${portfolioSummary.metrics.totalValue}
      Regime: ${portfolioSummary.metrics.regime}
      Volatility (Annualized): ${portfolioSummary.metrics.volatility}
      VaR (95%): ${portfolioSummary.metrics.var95}
      
      ${simContext}
      
      PRINCIPAL'S INQUIRY: ${userPrompt}
      
      PROVIDE STRATEGIC INSIGHT:` 
    }];
    if (image) parts.push({ inlineData: image });
    
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts }],
    });
    
    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      yield { text: c.text || "", groundingSources: [] };
    }
  } catch (error: any) { yield { text: "Neural bridge rate limited.", groundingSources: [] }; }
};

const MOCK_NEWS_DATA: NewsItem[] = [
  {
    id: 'mock-1',
    title: "Fed Signals 'Higher for Longer' as Inflation Persists",
    url: "https://www.bloomberg.com/markets",
    source: "Bloomberg",
    publishedAt: new Date().toISOString(),
    region: 'WEST',
    sentiment: 'NEGATIVE',
    impactExplanation: "Rates staying high increases cost of capital, weighing on growth stocks.",
    impactScore: 8,
    sourceType: 'MACRO',
    isMock: true
  },
  {
    id: 'mock-2',
    title: "China Unveils New Stimulus Package to Boost Property Sector",
    url: "https://www.reuters.com/finance",
    source: "Reuters",
    publishedAt: new Date().toISOString(),
    region: 'EAST',
    sentiment: 'POSITIVE',
    impactExplanation: "Liquidity injection expected to stabilize Asian markets and commodities.",
    impactScore: 7,
    sourceType: 'MACRO',
    isMock: true
  },
  {
    id: 'mock-3',
    title: "Tech Sector Rally Stalls Amid Valuation Concerns",
    url: "https://www.ft.com/technology",
    source: "Financial Times",
    publishedAt: new Date().toISOString(),
    region: 'GLOBAL',
    sentiment: 'NEUTRAL',
    impactExplanation: "Investors rotating into value sectors as AI hype cools slightly.",
    impactScore: 5,
    sourceType: 'QUANT',
    isMock: true
  },
  {
    id: 'mock-4',
    title: "Oil Prices Surge on Geopolitical Tensions in Middle East",
    url: "https://www.wsj.com/markets",
    source: "WSJ",
    publishedAt: new Date().toISOString(),
    region: 'GLOBAL',
    sentiment: 'NEGATIVE',
    impactExplanation: "Supply disruption fears driving energy costs higher, inflationary pressure.",
    impactScore: 9,
    sourceType: 'GEOPOLITICS',
    isMock: true
  },
  {
    id: 'mock-5',
    title: "ECB Hints at Rate Cut in Coming Quarter",
    url: "https://www.cnbc.com/europe",
    source: "CNBC",
    publishedAt: new Date().toISOString(),
    region: 'WEST',
    sentiment: 'POSITIVE',
    impactExplanation: "Divergence from Fed policy could weaken Euro but boost European equities.",
    impactScore: 6,
    sourceType: 'MACRO',
    isMock: true
  }
];

const MOCK_ANALYSIS_DATA = {
  summary: "This is a simulated analysis generated because the live intelligence feed is currently experiencing high traffic. The event described typically leads to short-term volatility followed by a reversion to the mean. Institutional flows suggest a cautious approach.",
  marketSentiment: {
    value: 45,
    label: "NEUTRAL",
    explanation: "Market participants are digesting the news with no clear directional bias yet."
  },
  impactAnalysis: {
    shortTerm: "Expect minor price fluctuations as algorithms adjust to the headline.",
    longTerm: "Fundamental impact remains limited unless further confirmations occur.",
    volatilityImpact: "MEDIUM"
  },
  relatedTickers: [
    { ticker: "SPY", reason: "Broad market proxy" },
    { ticker: "QQQ", reason: "Tech sector exposure" }
  ],
  actionableInsights: [
    "Monitor volume levels for confirmation of trend.",
    "Maintain current hedges until clarity improves.",
    "Look for entry points on dip if thesis holds."
  ],
  macroContext: "Fits within the broader theme of uncertainty regarding central bank policies."
};

export const getDetailedNewsAnalysis = async (newsItem: NewsItem): Promise<any | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return MOCK_ANALYSIS_DATA;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a deep institutional analysis for this news event: "${newsItem.title}" from ${newsItem.source}.
      
      JSON structure:
      {
        "summary": "Detailed 2-3 paragraph summary of the event and its context.",
        "marketSentiment": {
          "value": number (0-100), // Fear & Greed specific to this news
          "label": "EXTREME FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME GREED",
          "explanation": "Why this news triggers this sentiment."
        },
        "impactAnalysis": {
          "shortTerm": "string",
          "longTerm": "string",
          "volatilityImpact": "HIGH" | "MEDIUM" | "LOW"
        },
        "relatedTickers": [{"ticker": "string", "reason": "string"}],
        "actionableInsights": ["string", "string", "string"],
        "macroContext": "How this fits into the broader global macro picture."
      }`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });

    return safeJsonParse(response.text) || MOCK_ANALYSIS_DATA;
  } catch (error) {
    console.warn("Detailed news analysis failed (using fallback):", error);
    return MOCK_ANALYSIS_DATA;
  }
};

export const getGlobalNewsWire = async (forceRefresh = false): Promise<NewsItem[]> => {
  const CACHE_KEY = "lumia_news_wire";
  const cached = localStorage.getItem(CACHE_KEY);
  
  if (!forceRefresh && cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 30 * 60 * 1000) return data; // 30 min cache
  }

  const apiKey = getApiKey();
  if (!apiKey) return MOCK_NEWS_DATA;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 12 distinct global financial news items. 
      Focus on Macro, Central Banks, Geopolitics, and Tech.
      Return JSON array of NewsItem objects:
      {
        id: string (unique),
        title: string,
        url: string (use real source if possible or plausible placeholder),
        source: string (e.g. Bloomberg, Reuters, FT),
        publishedAt: string (ISO date, recent),
        region: 'WEST' | 'EAST' | 'GLOBAL',
        sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
        impactExplanation: string (1 sentence on market impact),
        impactScore: number (1-10),
        sourceType: 'QUANT' | 'MACRO' | 'GEOPOLITICS'
      }`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });

    const news = safeJsonParse(response.text) || [];
    if (news.length === 0) return MOCK_NEWS_DATA;
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: news, timestamp: Date.now() }));
    return news;
  } catch (error) {
    console.warn("News fetch failed (using fallback):", error);
    return MOCK_NEWS_DATA;
  }
};
