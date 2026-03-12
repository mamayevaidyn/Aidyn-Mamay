import React, { useState, useMemo } from 'react';
import { PortfolioState, Asset, MonteCarloResult, NewsItem, NewsRegion } from '../types';
import { generateMonteCarloSimulation, calculateCorrelation, calculateCovariance, calculateRollingPortfolioRisk } from '../services/quantEngine';
import { auditPortfolioRisk } from '../services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceArea
} from 'recharts';
import { 
  Grid3X3, 
  Layers, 
  ShieldAlert, 
  Zap, 
  Activity, 
  TrendingDown, 
  BrainCircuit, 
  Loader2, 
  AlertTriangle, 
  Flame,
  ArrowRight,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Globe,
  Coins,
  Scale,
  History
} from 'lucide-react';

interface RiskEngineProps {
  portfolio: PortfolioState;
}

const RiskEngine: React.FC<RiskEngineProps> = ({ portfolio }) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(
    portfolio.assets ? portfolio.assets.slice(0, 6).map(a => a.ticker) : []
  );
  const [matrixType, setMatrixType] = useState<'correlation' | 'covariance'>('correlation');
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [inspectedPair, setInspectedPair] = useState<{ a1: string, a2: string, value: number } | null>(null);
  const [mcDays, setMcDays] = useState(252);
  const [mcDrift, setMcDrift] = useState(0); // 0 = Neutral, >0 = Bull, <0 = Bear
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'JPY' | 'BTC'>('USD');

  // Mock FX Rates
  const fxRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.5,
    BTC: 0.000015
  };

  const currencySymbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    BTC: '₿'
  };

  const convert = (val: number) => val * fxRates[displayCurrency];
  const formatCurrency = (val: number) => {
    const converted = convert(val);
    if (displayCurrency === 'BTC') return `₿${converted.toFixed(6)}`;
    return `${currencySymbol[displayCurrency]}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const mcResults = useMemo(() => {
    return portfolio.assets && portfolio.assets.length > 0 
      ? generateMonteCarloSimulation(portfolio.assets, mcDays, 1000, mcDrift) 
      : { paths: [], stats: { meanFinalValue: 0, medianFinalValue: 0, p5: 0, p95: 0, probabilityOfLoss: 0 } }; 
  }, [portfolio.assets, mcDays, mcDrift]);
  
  const bins: { range: string, count: number, value: number }[] = useMemo(() => {
    if (!mcResults.paths || mcResults.paths.length === 0) return [];
    const b: { range: string, count: number, value: number }[] = [];
    const finalValues = Object.keys(mcResults.paths[mcResults.paths.length - 1])
      .filter(k => k.startsWith('path_'))
      .map(k => mcResults.paths[mcResults.paths.length - 1][k] as number);
    
    finalValues.sort((a, b) => a - b);
    const min = finalValues[0];
    const max = finalValues[finalValues.length - 1];
    const step = (max - min) / 35;

    for (let i = 0; i < 35; i++) {
      const low = min + i * step;
      const high = low + step;
      const count = finalValues.filter(r => r >= low && r < high).length;
      b.push({ range: (low - 100).toFixed(1) + '%', count, value: low });
    }
    return b;
  }, [mcResults]);

  const riskDecomposition = useMemo(() => {
    if (!portfolio.assets) return [];
    return portfolio.assets.map(asset => {
      const weight = asset.weight || 0;
      const vol = asset.volatility || 0;
      const beta = asset.beta || 1;
      const contribution = (weight * vol * beta) * 100;
      return {
        ticker: asset.ticker,
        contribution: contribution,
        impact: contribution > 6 ? 'HIGH' : contribution > 2.5 ? 'MEDIUM' : 'LOW'
      };
    }).sort((a, b) => b.contribution - a.contribution);
  }, [portfolio.assets]);

  const taxOpportunities = useMemo(() => {
    if (!portfolio.assets) return [];
    return portfolio.assets
      .filter(a => {
        // Calculate unrealized P&L based on avgBuyPrice if available, otherwise fallback to lastChange
        const buyPrice = a.avgBuyPrice || a.price; // Default to current price if no buy price (no loss)
        const unrealizedPnL = (a.price - buyPrice) / buyPrice;
        return unrealizedPnL < -0.05; // Loss > 5%
      })
      .map(a => {
        const buyPrice = a.avgBuyPrice || a.price;
        const lossAmount = (buyPrice - a.price) * (a.quantity || 0);
        return {
          ticker: a.ticker,
          loss: lossAmount,
          harvestable: lossAmount * 0.3 // Assume 30% tax rate
        };
      });
  }, [portfolio.assets]);

  const runAiAudit = async () => {
    setAiAuditing(true);
    setAiAuditResult(null);
    try {
      const result = await auditPortfolioRisk(portfolio);
      setAiAuditResult(result);
    } finally {
      setAiAuditing(false);
    }
  };

  const computedScenarios = useMemo(() => {
    const avgBeta = portfolio.metrics.beta;
    const baseShocks: Record<string, number> = {
      'Tech Correction': -10,
      'Yield Curve Spike': -5,
      'Global Liquidity Shock': -15
    };
    
    const sectorMultipliers: Record<string, Record<string, number>> = {
      'Tech Correction': { 'Technology': 1.5, 'Crypto': 1.8, 'Energy': 0.3, 'Financials': 0.8 },
      'Yield Curve Spike': { 'Financials': 1.4, 'Technology': 0.8, 'Real Estate': 1.6 },
      'Global Liquidity Shock': { 'Crypto': 2.0, 'Technology': 1.2, 'Financials': 1.1 }
    };

    return Object.entries(baseShocks).map(([name, baseShock]) => {
      let weightedMultiplier = 0;
      if (portfolio.assets) {
        portfolio.assets.forEach(a => {
          const m = sectorMultipliers[name]?.[a.sector || ''] || 1.0;
          weightedMultiplier += (a.weight || 0) * m;
        });
      }
      
      const concentrationPenalty = portfolio.metrics.diversificationScore < 50 ? 1.2 : 1.0;
      const delta = baseShock * avgBeta * weightedMultiplier * concentrationPenalty;
      
      return {
        name,
        delta: Number(delta.toFixed(1)),
        impact: Math.abs(delta) / 10,
        icon: name === 'Tech Correction' ? <TrendingDown size={14} /> : name === 'Yield Curve Spike' ? <Flame size={14} /> : <Activity size={14} />,
        color: delta < -15 ? 'text-rose-600' : delta < -8 ? 'text-red-400' : 'text-orange-400'
      };
    });
  }, [portfolio.metrics.beta, portfolio.metrics.diversificationScore, portfolio.assets]);

  const getHeatmapColor = (val: number) => {
    if (matrixType === 'correlation') {
      if (val > 0.8) return 'bg-indigo-600';
      if (val > 0.5) return 'bg-indigo-500/70';
      if (val > 0.2) return 'bg-indigo-500/40';
      if (val > -0.2) return 'bg-white/5';
      if (val > -0.5) return 'bg-red-500/30';
      return 'bg-red-500/60';
    }
    return val > 0 ? 'bg-indigo-500/40' : 'bg-red-500/20';
  };

  const matrixData = useMemo(() => {
    if (!portfolio.assets) return { assets: [], matrix: [] };
    const selectedAssets = portfolio.assets.filter(a => selectedTickers.includes(a.ticker));
    const matrix: number[][] = [];
    
    selectedAssets.forEach((a1, i) => {
      matrix[i] = [];
      selectedAssets.forEach((a2, j) => {
        if (matrixType === 'correlation') {
          matrix[i][j] = calculateCorrelation(a1, a2);
        } else {
          matrix[i][j] = calculateCovariance(a1, a2);
        }
      });
    });
    return { assets: selectedAssets, matrix };
  }, [selectedTickers, portfolio.assets, matrixType]);

  const riskExplainers: Record<string, string> = {
    'var95': 'Value at Risk (95%) represents the maximum expected loss with a 95% confidence level over a one-month horizon. It filters out standard daily fluctuations to focus on significant capital impairment.',
    'expectedShortfall': 'Also known as CVaR, this measures the average loss in the extreme 5% of cases. It answers: "If we breach our VaR, how much deeper could the hole be?"',
    'beta': 'Measures sensitivity to the S&P 500. A beta of 1.5 suggests the portfolio is 50% more volatile than the market baseline.',
    'diversification': 'Indicates how well your risk is spread. A score of 80+ suggests that individual asset shocks are unlikely to sink the entire NAV.'
  };

  const navVaR = (portfolio.totalValue * portfolio.metrics.var95 / 100);
  const navES = (portfolio.totalValue * portfolio.metrics.expectedShortfall / 100);

  const rollingRiskData = useMemo(() => {
    if (!portfolio.assets || portfolio.assets.length === 0) return [];
    return calculateRollingPortfolioRisk(portfolio.assets, 30);
  }, [portfolio.assets]);

  return (
    <div className="space-y-6 lg:space-y-12 animate-in fade-in duration-500 pb-24 max-w-[1600px] mx-auto">
      {/* Header with Currency Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 bg-[#0b0f1a] p-1 rounded-xl border border-white/10">
          <Globe size={14} className="text-gray-500 ml-2" />
          {(['USD', 'EUR', 'GBP', 'JPY', 'BTC'] as const).map(c => (
            <button
              key={c}
              onClick={() => setDisplayCurrency(c)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${displayCurrency === c ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Impact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden rounded-[40px] border border-white/5 bg-[#0b0f1a] p-10 shadow-2xl flex flex-col md:flex-row gap-12">
           <div className="flex-1 space-y-8">
              <div className="flex items-center gap-3">
                 <ShieldAlert className="text-red-500" size={24} />
                 <h2 className="text-2xl font-black text-white tracking-tight uppercase">Capital at Risk Analysis</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div 
                    onMouseEnter={() => setHoveredMetric('var95')} 
                    onMouseLeave={() => setHoveredMetric(null)}
                    className="relative p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-red-500/30 transition-all cursor-help overflow-hidden"
                 >
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1 truncate">Monthly VaR (95%)</span>
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white mono mb-2 truncate">
                       {portfolio.metrics.var95.toFixed(2)}%
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                       <span className="text-sm md:text-base lg:text-lg font-bold text-red-500 mono">-{formatCurrency(navVaR)}</span>
                       <span className="text-[7px] md:text-[8px] font-bold text-gray-700 uppercase">Est. Impact</span>
                    </div>
                    {hoveredMetric === 'var95' && (
                       <div className="absolute top-full mt-4 left-0 right-0 z-50 p-4 bg-black border border-white/10 rounded-2xl text-[11px] text-gray-400 leading-relaxed shadow-2xl animate-in zoom-in-95">
                          {riskExplainers.var95}
                       </div>
                    )}
                 </div>

                 <div 
                    onMouseEnter={() => setHoveredMetric('expectedShortfall')} 
                    onMouseLeave={() => setHoveredMetric(null)}
                    className="relative p-5 bg-white/5 border border-white/5 rounded-3xl hover:border-red-500/30 transition-all cursor-help overflow-hidden"
                 >
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1 truncate">Expected Shortfall</span>
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white mono mb-2 truncate">
                       {portfolio.metrics.expectedShortfall.toFixed(2)}%
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                       <span className="text-sm md:text-base lg:text-lg font-bold text-red-600 mono">-{formatCurrency(navES)}</span>
                       <span className="text-[7px] md:text-[8px] font-bold text-gray-700 uppercase">Worst 5% Mean</span>
                    </div>
                    {hoveredMetric === 'expectedShortfall' && (
                       <div className="absolute top-full mt-4 left-0 right-0 z-50 p-4 bg-black border border-white/10 rounded-2xl text-[11px] text-gray-400 leading-relaxed shadow-2xl animate-in zoom-in-95">
                          {riskExplainers.expectedShortfall}
                       </div>
                    )}
                 </div>
              </div>
           </div>
           
           <div className="w-full md:w-64 bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                 <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">LUMIA Sentinel</span>
                 </div>
                 <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic">
                    "Your tail risk is heavily concentrated in {riskDecomposition[0]?.ticker}. Consider a delta-neutral hedge."
                 </p>
              </div>
              <button 
                onClick={runAiAudit}
                disabled={aiAuditing}
                className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                 {aiAuditing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                 {aiAuditing ? 'Auditing...' : 'Full Audit'}
              </button>
           </div>
        </div>

        <div className="standard-card p-10 bg-[#0b0f1a] flex flex-col justify-between">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest">Diversification Score</h3>
              <Info size={14} className="text-gray-800" />
           </div>
           <div className="flex items-baseline gap-3 my-6">
              <span className="text-6xl font-black text-white tracking-tighter">{portfolio.metrics.diversificationScore.toFixed(0)}</span>
              <span className="text-lg font-bold text-indigo-500 uppercase">/ 100</span>
           </div>
           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-indigo-500 to-green-500 transition-all duration-1000" 
                style={{ width: `${portfolio.metrics.diversificationScore}%` }}
              />
           </div>
           
           {/* Tax Efficiency Mini-Card */}
           <div className="mt-8 pt-6 border-t border-white/5">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                 <Scale size={12} className="text-emerald-500" /> Tax Efficiency
               </span>
               <span className="text-xs font-bold text-emerald-400">{taxOpportunities.length} Opps</span>
             </div>
             <div className="text-[10px] text-gray-400 leading-tight mb-2">
               Potential Harvest: <span className="text-white font-mono">{formatCurrency(taxOpportunities.reduce((acc, curr) => acc + curr.harvestable, 0))}</span>
             </div>
             {taxOpportunities.length > 0 && (
               <div className="space-y-1 mt-2">
                 {taxOpportunities.slice(0, 3).map(op => (
                   <div key={op.ticker} className="flex justify-between items-center text-[9px]">
                     <span className="text-gray-500 font-bold">{op.ticker}</span>
                     <span className="text-emerald-500 mono">+{formatCurrency(op.harvestable)}</span>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>

      {aiAuditResult && (
        <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[32px] animate-in slide-in-from-top-4 overflow-hidden">
           <div className="flex items-center gap-3 mb-4">
              <BrainCircuit size={18} className="text-indigo-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Institutional Neural Audit</h4>
           </div>
           <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed italic break-words">
              {aiAuditResult}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Advanced Risk Decomposition */}
         <div className="lg:col-span-8 standard-card p-10 bg-[#0b0f1a]">
            <div className="flex items-center justify-between mb-12">
               <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Layers size={16} className="text-indigo-400" /> Component Risk Attribution
                  </h3>
                  <p className="text-[10px] text-gray-700 font-bold uppercase mt-2">Weighted contribution to portfolio volatility</p>
               </div>
            </div>
            
            <div className="space-y-8">
               {riskDecomposition.map((asset) => (
                 <div key={asset.ticker} className="group cursor-default">
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                       <div className="flex items-center gap-3">
                          <span className="text-white mono bg-white/5 px-2 py-1 rounded-md">{asset.ticker}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${asset.impact === 'HIGH' ? 'text-red-500' : asset.impact === 'MEDIUM' ? 'text-indigo-500' : 'text-gray-600'}`}>
                             {asset.impact} Sensitivity
                          </span>
                       </div>
                       <span className="text-gray-500 mono">{asset.contribution.toFixed(2)}% DaR Share</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex items-center px-1">
                       <div 
                        className={`h-1.5 rounded-full transition-all duration-1000 ${asset.impact === 'HIGH' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : asset.impact === 'MEDIUM' ? 'bg-indigo-500' : 'bg-gray-700'}`} 
                        style={{ width: `${Math.min(100, asset.contribution * 8)}%` }}
                       />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Scenario Stress Engine */}
         <div className="lg:col-span-4 bg-red-600/5 border border-red-500/10 rounded-[40px] p-10 flex flex-col">
            <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-10">
               <Zap size={16} /> Live Stress Simulations
            </h3>
            <div className="space-y-4 flex-1">
               {computedScenarios.map((s, i) => (
                 <button 
                  key={i}
                  onClick={() => setActiveScenario(s.name)}
                  className={`w-full p-6 rounded-3xl border transition-all text-left flex items-center justify-between group ${activeScenario === s.name ? 'bg-red-500/20 border-red-500' : 'bg-[#0b0f1a] border-white/5 hover:border-red-500/30'}`}
                 >
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          {s.icon}
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">{s.name}</span>
                       </div>
                       <p className="text-[9px] text-gray-600 font-bold uppercase">Reproduced Event</p>
                    </div>
                    <div className={`text-xl font-bold mono ${s.color}`}>{s.delta}%</div>
                 </button>
               ))}
            </div>
            
            {activeScenario && (
              <div className="mt-8 p-6 bg-black/60 rounded-[32px] border border-red-500/30 animate-in zoom-in-95">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Est. NAV Decay</span>
                    <button onClick={() => setActiveScenario(null)} className="text-gray-700 hover:text-white"><ChevronUp size={14}/></button>
                 </div>
                 <div className="text-3xl font-bold text-red-500 mono mb-3">
                   -{formatCurrency(portfolio.totalValue * Math.abs(computedScenarios.find(s => s.name === activeScenario)?.delta || 0) / 100)}
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    Strategy Recommendation: Hedge Beta <ArrowRight size={12} />
                 </div>
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
         {/* Monte Carlo Path Projection */}
         <div className="standard-card p-10 bg-[#0b0f1a] overflow-hidden">
            <div className="flex justify-between items-center mb-12">
               <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Activity size={16} className="text-indigo-400" /> Neural Path Projection
                  </h3>
                  <p className="text-[10px] text-gray-700 font-bold uppercase mt-2">Geometric Brownian Motion (GBM) Simulation</p>
               </div>
               <div className="flex flex-col items-end gap-2">
                 <div className="flex gap-2">
                    {[63, 126, 252].map(d => (
                      <button 
                        key={d}
                        onClick={() => setMcDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mcDays === d ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-600'}`}
                      >
                        {d === 252 ? '1Y' : d === 126 ? '6M' : '3M'}
                      </button>
                    ))}
                 </div>
                 <div className="flex gap-1">
                    {/* Drift Controls */}
                    <button onClick={() => setMcDrift(-1)} className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${mcDrift < 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-600'}`}>Bear</button>
                    <button onClick={() => setMcDrift(0)} className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${mcDrift === 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-600'}`}>Neutral</button>
                    <button onClick={() => setMcDrift(1)} className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${mcDrift > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-600'}`}>Bull</button>
                 </div>
               </div>
            </div>

            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mcResults.paths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Calculate summary stats from the payload
                          const values = payload.map(p => p.value as number).sort((a, b) => a - b);
                          const p5 = values[Math.floor(values.length * 0.05)] || 0;
                          const p50 = values[Math.floor(values.length * 0.5)] || 0;
                          const p95 = values[Math.floor(values.length * 0.95)] || 0;
                          
                          return (
                            <div className="p-4 bg-[#020617] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Simulation Day {label}</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-8">
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Best Case (P95)</span>
                                  <span className="text-xs font-bold text-emerald-400 mono">${Number(p95).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                  <span className="text-[10px] text-white uppercase font-bold tracking-tight">Median (P50)</span>
                                  <span className="text-xs font-bold text-white mono">${Number(p50).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                  <span className="text-[10px] text-gray-500 uppercase font-bold">Worst Case (P5)</span>
                                  <span className="text-xs font-bold text-rose-400 mono">${Number(p5).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {mcResults.paths.length > 0 && Object.keys(mcResults.paths[0]).filter(k => k.startsWith('path_')).map((pathKey, idx) => (
                      <Line 
                        key={pathKey}
                        type="monotone" 
                        dataKey={pathKey} 
                        stroke={idx === 0 ? '#6366f1' : '#6366f1'} 
                        strokeWidth={idx === 0 ? 2 : 1}
                        strokeOpacity={idx === 0 ? 0.8 : 0.1}
                        dot={false}
                        animationDuration={2000}
                      />
                    ))}
                  </LineChart>
               </ResponsiveContainer>
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">Prob. of Loss</span>
                  <span className={`text-lg font-bold mono ${mcResults.stats.probabilityOfLoss > 50 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {mcResults.stats.probabilityOfLoss.toFixed(1)}%
                  </span>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">Median NAV</span>
                  <span className="text-lg font-bold text-white mono">
                    {formatCurrency(mcResults.stats.medianFinalValue)}
                  </span>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">P95 (Bull)</span>
                  <span className="text-lg font-bold text-indigo-400 mono">
                    {formatCurrency(mcResults.stats.p95)}
                  </span>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">P5 (Bear)</span>
                  <span className="text-lg font-bold text-red-400 mono">
                    {formatCurrency(mcResults.stats.p5)}
                  </span>
               </div>
            </div>
         </div>

         {/* Interactive Correlation Engine */}
         <div className="standard-card p-10 bg-[#0b0f1a] overflow-hidden">
            <div className="flex justify-between items-center mb-12">
               <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Grid3X3 size={16} className="text-indigo-400" /> Interaction Matrix
                  </h3>
                  <p className="text-[10px] text-gray-700 font-bold uppercase mt-2">Pairwise asset coupling analysis</p>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => setMatrixType('correlation')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${matrixType === 'correlation' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-600'}`}
                  >Correlation</button>
                  <button 
                    onClick={() => setMatrixType('covariance')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${matrixType === 'covariance' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-600'}`}
                  >Covariance</button>
               </div>
            </div>

            <div className="relative overflow-x-auto no-scrollbar">
              <div className="min-w-[450px]">
                <div className="grid" style={{ gridTemplateColumns: `70px repeat(${matrixData.assets.length}, 1fr)` }}>
                  <div />
                  {matrixData.assets.map(a => (
                    <div key={a.ticker} className="text-center pb-4 text-[10px] font-black text-gray-700 uppercase">
                      {a.ticker}
                    </div>
                  ))}
                  {matrixData.matrix.map((row, i) => (
                    <React.Fragment key={i}>
                      <div className="pr-4 text-[10px] font-black text-gray-700 uppercase flex items-center justify-end h-14">
                        {matrixData.assets[i].ticker}
                      </div>
                      {row.map((val, j) => (
                        <div 
                          key={j} 
                          onClick={() => setInspectedPair({ a1: matrixData.assets[i].ticker, a2: matrixData.assets[j].ticker, value: val })}
                          onMouseEnter={() => setHoveredMetric(`matrix-${i}-${j}`)}
                          onMouseLeave={() => setHoveredMetric(null)}
                          className={`h-14 m-0.5 rounded-2xl flex flex-col items-center justify-center text-[11px] font-mono font-bold transition-all hover:scale-110 hover:z-10 cursor-pointer ${getHeatmapColor(val)} ${hoveredMetric === `matrix-${i}-${j}` ? 'ring-2 ring-white/50' : ''}`}
                        >
                          <span className={Math.abs(val) > 0.4 ? 'text-white' : 'text-gray-500'}>
                            {matrixType === 'correlation' ? val.toFixed(2) : (val/1000).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {inspectedPair && (
               <div className="mt-10 p-6 bg-[#020617] border border-white/10 rounded-3xl animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-4">
                     <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Coupling Inspector</h4>
                     <button onClick={() => setInspectedPair(null)}><ChevronDown size={14}/></button>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-xl font-bold text-white mono">
                        {inspectedPair.a1} <span className="text-gray-700 px-2">+</span> {inspectedPair.a2}
                     </div>
                     <div className="h-8 w-[1px] bg-white/10" />
                     <div className="text-sm font-bold text-gray-400">
                        {inspectedPair.value > 0.7 ? 'Strong Positive Coupling (High Risk Concentration)' : 
                         inspectedPair.value < -0.3 ? 'Effective Hedging Pair (Risk Offset)' : 
                         'Low Structural Linkage'}
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* Distribution & Tail Visualization */}
         <div className="grid grid-cols-1 gap-8">
            <div className="standard-card p-10 bg-[#0b0f1a]">
                <div className="flex items-center justify-between mb-12">
                   <div>
                      <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Target size={16} className="text-indigo-400" /> Statistical Loss Distribution
                      </h3>
                      <p className="text-[10px] text-gray-700 font-bold uppercase mt-2">Monte Carlo Simulation (n=1,000)</p>
                   </div>
                </div>
                
                <div className="h-[300px] min-h-[300px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bins}>
                        <XAxis dataKey="range" hide />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#6366f1', opacity: 0.1 }}
                          content={({ active, payload }) => {
                             if (active && payload && payload.length) {
                                return (
                                   <div className="p-4 bg-black border border-white/10 rounded-2xl shadow-2xl">
                                      <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Probability Bucket</p>
                                      <p className="text-sm font-bold text-white mono">{payload[0].payload.range}</p>
                                      <p className="text-[9px] text-indigo-400 mt-2 font-bold uppercase">{payload[0].value} Paths Converged</p>
                                   </div>
                                );
                             }
                             return null;
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {bins.map((entry, index) => (
                            <Cell 
                               key={`cell-${index}`} 
                               fill={index < 5 ? '#ef4444' : index > 28 ? '#10b981' : '#6366f1'} 
                               fillOpacity={index < 5 ? 0.9 : 0.6}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                
                <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
                   <div className="flex gap-8">
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                         <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tail Risk (DaR Zone)</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-indigo-500" />
                         <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Confidence Interval</span>
                      </div>
                   </div>
                   <div className="px-5 py-2 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                      <Activity size={12} className="text-indigo-400" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mono">
                        Kurtosis: {portfolio.metrics.kurtosisLabel || 'Institutional_Normal'} ({portfolio.metrics.kurtosis?.toFixed(2) || '0.00'})
                      </span>
                   </div>
                </div>
            </div>

            {/* Dynamic Risk Monitor (Rolling VaR + Regime) */}
            {rollingRiskData.length > 0 ? (
                <div className="standard-card p-0 bg-[#0b0f1a] overflow-hidden flex flex-col h-full">
                  {/* Header Section */}
                  <div className="p-8 pb-4 border-b border-white/5">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                          <History size={16} className="text-indigo-400" /> Market Regime Detector
                        </h3>
                        <p className="text-[10px] text-gray-600 font-bold uppercase mt-2">HMM · 3-State · Live</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-1">
                           <div className={`w-2 h-2 rounded-full ${portfolio.regime === 'CONTRACTION' ? 'bg-red-500 animate-pulse' : portfolio.regime === 'TRANSITIONAL' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${portfolio.regime === 'CONTRACTION' ? 'text-red-500' : portfolio.regime === 'TRANSITIONAL' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                             {portfolio.regime}
                           </span>
                        </div>
                        <span className="text-[9px] text-gray-600 font-mono">{portfolio.metrics.regimeConfidence || 0}% CONFIDENCE</span>
                      </div>
                    </div>

                    {/* Regime Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                       <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Bull Prob</span>
                          <span className="text-sm font-mono text-emerald-400">
                            {portfolio.metrics.regimeProbs ? (portfolio.metrics.regimeProbs.bull * 100).toFixed(0) : '33'}%
                          </span>
                       </div>
                       <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Neutral Prob</span>
                          <span className="text-sm font-mono text-yellow-400">
                            {portfolio.metrics.regimeProbs ? (portfolio.metrics.regimeProbs.neutral * 100).toFixed(0) : '33'}%
                          </span>
                       </div>
                       <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Bear Prob</span>
                          <span className="text-sm font-mono text-red-400">
                            {portfolio.metrics.regimeProbs ? (portfolio.metrics.regimeProbs.bear * 100).toFixed(0) : '33'}%
                          </span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Chart Section */}
                  <div className="flex-1 relative min-h-[250px] bg-gradient-to-b from-[#0b0f1a] to-black/40">
                    <div className="absolute top-4 left-6 z-10">
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Rolling VaR (95%)</span>
                       <span className="text-xl font-bold text-white mono">-{formatCurrency(rollingRiskData[rollingRiskData.length-1].var95)}</span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={rollingRiskData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVaR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 9, fill: '#525252'}} 
                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                            minTickGap={40}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 9, fill: '#ef4444'}} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                          labelStyle={{ color: '#a1a1aa', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === 'var95' ? 'VaR (95%)' : name === 'cvar95' ? 'CVaR (Tail)' : 'Portfolio Value'
                          ]}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('en-US')}
                        />
                        
                        {/* Regime Backgrounds */}
                        {rollingRiskData.map((entry, index) => {
                            if (index === 0) return null;
                            const prev = rollingRiskData[index-1];
                            return (
                                <ReferenceArea 
                                    key={entry.date} 
                                    x1={prev.date} 
                                    x2={entry.date} 
                                    yAxisId="left"
                                    fill={entry.regime === 'HIGH_VOL' ? '#ef4444' : entry.regime === 'NORMAL_VOL' ? '#eab308' : '#10b981'} 
                                    fillOpacity={0.03} 
                                />
                            );
                        })}

                        <Area 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="var95" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorVaR)" 
                            name="var95"
                        />
                        <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="cvar95" 
                            stroke="#7f1d1d" 
                            strokeWidth={1} 
                            strokeDasharray="4 4"
                            dot={false} 
                            name="cvar95"
                        />
                        <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="value" 
                            stroke="#6366f1" 
                            strokeWidth={2} 
                            dot={(props: any) => {
                                const { cx, cy, payload, index } = props;
                                const key = payload.date || index;
                                if (payload.breach) {
                                    return <circle cx={cx} cy={cy} r={3} fill="#ef4444" stroke="white" strokeWidth={1} key={key} />;
                                }
                                return <circle cx={cx} cy={cy} r={0} key={key} />;
                            }}
                            name="value"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Footer Stats */}
                  <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                     <div>
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Breach Rate</span>
                        <span className="text-xs font-mono text-emerald-400">
                          {portfolio.metrics.breachRate?.toFixed(1) || '4.2'}% 
                          <span className="text-gray-600 ml-1">({portfolio.metrics.breachLabel || 'Healthy'})</span>
                        </span>
                     </div>
                     <div className="text-right">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Current CVaR</span>
                        <span className="text-xs font-mono text-red-400">-{formatCurrency(rollingRiskData[rollingRiskData.length-1].cvar95)}</span>
                     </div>
                  </div>
                </div>
            ) : (
                <div className="standard-card p-10 bg-[#0b0f1a] flex items-center justify-center">
                    <p className="text-gray-500 text-xs uppercase tracking-widest">Insufficient Data for Rolling Risk</p>
                </div>
            )}
         </div>
      </div>
      {/* Risk Disclosure Footer */}
      <div className="p-10 border border-white/5 rounded-3xl bg-white/[0.01] mt-12">
        <div className="flex items-start gap-6">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="text-amber-500" size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Quantitative Model Risk Disclosure</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
              ALL QUANTITATIVE MODELS, INCLUDING MONTE CARLO SIMULATIONS AND VAR CALCULATIONS, ARE BASED ON HISTORICAL DATA AND STATISTICAL PROBABILITIES. THEY DO NOT PREDICT FUTURE MARKET MOVEMENTS WITH CERTAINTY. USERS SHOULD NOT RELY SOLELY ON THESE MODELS FOR TRADING DECISIONS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskEngine;
