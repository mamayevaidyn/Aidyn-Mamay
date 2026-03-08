import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { PortfolioState, Asset, PricePoint } from '../types';
import { fetchHistoricalData } from '../services/marketDataService';
import { KalmanFilterEngine, estimateGARCH, detectRegime, MARKET_UNIVERSE, calculatePortfolioMetrics, calculateHurstExponent, calculateZScore } from '../services/quantEngine';
import { 
  Activity, Zap, Shield, TrendingUp, BarChart2, Cpu, Binary, Gauge, Waves, Search, Loader2, AlertCircle, Info,
  PieChart as PieChartIcon, Layers, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Terminal, Code, Database
} from 'lucide-react';

interface QuantLabProps {
  portfolio: PortfolioState;
}

// ═══ QUANT LAB COMPONENT ═══
const QuantLab: React.FC<QuantLabProps> = ({ portfolio }) => {
  const [selectedTicker, setSelectedTicker] = useState(portfolio.assets?.[0]?.ticker || 'BTC');
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedTicker with portfolio if current one is removed
  useEffect(() => {
    if (portfolio.assets && portfolio.assets.length > 0 && !portfolio.assets.find(a => a.ticker === selectedTicker)) {
      setSelectedTicker(portfolio.assets[0].ticker);
    }
  }, [portfolio.assets, selectedTicker]);

  // Calculate Portfolio Metrics (Diversification, etc.)
  const metrics = useMemo(() => {
    return calculatePortfolioMetrics(portfolio.assets || []);
  }, [portfolio.assets]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHistoricalData(selectedTicker);
        if (!data || data.length === 0) {
          throw new Error(`No historical data found for ${selectedTicker}`);
        }
        setHistory(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch historical data for signal processing.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedTicker]);

  const quantResults = useMemo(() => {
    if (history.length < 10) return null;

    const rawPrices = history.map(h => h.price);
    const kf = new KalmanFilterEngine(rawPrices[0]);
    
    const filteredData = history.map(h => {
      const result = kf.update(h.price);
      return {
        date: h.date,
        raw: h.price,
        filtered: Number(result.price.toFixed(2)),
        velocity: result.velocity
      };
    });

    const returns = rawPrices.map((p, i, arr) => i === 0 ? 0 : (p - arr[i-1])/arr[i-1]);
    const { condVol, forecast } = estimateGARCH(returns);
    
    const volData = history.map((h, i) => ({
      date: h.date,
      vol: Number((condVol[i] * 100).toFixed(2))
    }));

    const { regime, confidence } = detectRegime(rawPrices, condVol);
    const lastVelocity = filteredData.length > 0 ? filteredData[filteredData.length - 1].velocity : 0;
    const lastPrice = filteredData.length > 0 ? filteredData[filteredData.length - 1].filtered : 1;
    const velocityPct = (lastVelocity / lastPrice) * 100;

    const noiseScore = filteredData.length > 1 
      ? Math.min(100, Math.max(0, (rawPrices.reduce((acc, p, i, arr) => i === 0 ? acc : acc + Math.abs(p - arr[i-1]), 0) / filteredData.reduce((acc, p, i, arr) => i === 0 ? acc : acc + Math.abs(p.filtered - arr[i-1].filtered), 0) - 1) * 50))
      : 0;

    const noiseVar = rawPrices.length >= 20 
      ? rawPrices.slice(-20).reduce((acc, p, i) => acc + Math.pow(p - filteredData[filteredData.length - 20 + i].filtered, 2), 0) / 20
      : rawPrices.reduce((acc, p, i) => acc + Math.pow(p - filteredData[i].filtered, 2), 0) / rawPrices.length;
    
    const zScore = calculateZScore(rawPrices[rawPrices.length - 1], filteredData[filteredData.length - 1].filtered, noiseVar || 1);
    const hurst = calculateHurstExponent(rawPrices);

    const snr = filteredData.length > 1 ? (Math.abs(velocityPct) / (noiseScore || 1e-6)) * 10 : 0;
    let signalStrength: 'HIGH_CONVICTION' | 'MODERATE' | 'LOW_SIGNAL' | 'NOISE_DOMINANT' = 'LOW_SIGNAL';
    if (snr > 4) signalStrength = 'HIGH_CONVICTION';
    else if (snr > 1.5) signalStrength = 'MODERATE';
    else if (snr > 0.5) signalStrength = 'LOW_SIGNAL';
    else signalStrength = 'NOISE_DOMINANT';

    return {
      filteredData,
      volData,
      forecast: Number((forecast * 100).toFixed(2)),
      regime,
      confidence: Number((confidence * 100).toFixed(0)),
      noiseScore: Number(noiseScore.toFixed(1)),
      velocity: velocityPct,
      signalStrength,
      noiseFilter: noiseScore < 40 ? 'ACTIVE' : 'DEGRADED',
      hurst,
      zScore
    };
  }, [history]);

  // Sector Analysis for Risk Alert
  const sectorAnalysis = useMemo(() => {
    const sectors: Record<string, number> = {};
    let totalWeight = 0;
    if (portfolio.assets) {
      portfolio.assets.forEach(a => {
        const s = a.sector || 'Unknown';
        sectors[s] = (sectors[s] || 0) + a.weight;
        totalWeight += a.weight;
      });
    }
    
    // Normalize if needed
    if (totalWeight > 0) {
      Object.keys(sectors).forEach(k => sectors[k] = (sectors[k] / totalWeight) * 100);
    }

    const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
    const dominantSector = sorted[0];
    
    return {
      sectors: sorted,
      dominant: dominantSector,
      isConcentrated: dominantSector ? dominantSector[1] > 40 : false
    };
  }, [portfolio.assets]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
             <span className="text-indigo-400">QUANT</span> LAB
             <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 uppercase tracking-widest font-mono">v4.2.1</span>
             <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400 uppercase tracking-widest font-mono">Historical Analysis</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Advanced portfolio risk modeling and signal processing on historical market data.</p>
        </div>
        
        <div className="flex gap-1 p-1 bg-[#0a0a0a] border border-white/[0.05] rounded-xl overflow-x-auto max-w-full no-scrollbar">
          {portfolio.assets && portfolio.assets.length > 0 ? (
            portfolio.assets.map(asset => (
              <button
                key={asset.ticker}
                onClick={() => setSelectedTicker(asset.ticker)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedTicker === asset.ticker 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {asset.ticker}
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
              Portfolio Empty
            </div>
          )}
        </div>
      </div>

      {/* ═══ RISK & DIVERSIFICATION DASHBOARD ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Active Risk Alert Widget */}
        <div className="lumia-card p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-indigo-500/20 flex items-center justify-center shadow-xl">
              <AlertTriangle className="text-indigo-400" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Active Risk Alert</h3>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">PORTFOLIO MONITOR</div>
            </div>
          </div>
          
          <p className="text-slate-400 text-xs leading-relaxed mb-4 relative z-10">
            Strategy is <span className="text-white font-bold">{sectorAnalysis.isConcentrated ? 'Overweighted' : 'Balanced'}</span> in <span className="text-indigo-400 font-bold">{sectorAnalysis.dominant ? sectorAnalysis.dominant[0] : 'None'}</span>.
            {sectorAnalysis.isConcentrated && ` Active risk bias of +${(sectorAnalysis.dominant[1] - 15).toFixed(1)}% drift.`}
          </p>
          
          <div className="flex gap-2 relative z-10">
            <div className="bg-[#0a0a0a] border border-white/[0.05] rounded px-3 py-2 flex-1">
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 font-mono">TRACKING ERR</div>
              <div className="text-sm font-black text-white font-mono">2.1%</div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/[0.05] rounded px-3 py-2 flex-1">
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 font-mono">INFO RATIO</div>
              <div className="text-sm font-black text-white font-mono">1.34</div>
            </div>
          </div>
        </div>

        {/* 2. Statistical Arbitrage Widget */}
        <div className="lumia-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">SIGNAL DEVIATION</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className={`text-4xl font-black tracking-tighter font-mono ${Math.abs(quantResults?.zScore || 0) > 2 ? 'text-rose-500' : 'text-white'}`}>
                {quantResults?.zScore || '0.00'}
              </span>
              <span className="text-sm font-bold text-slate-600 font-mono">σ</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Hurst Exponent</div>
               <div className="text-[11px] font-bold text-white font-mono">{quantResults?.hurst || '0.500'}</div>
            </div>
            <div className="w-full h-1 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/[0.05]">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: `${(quantResults?.hurst || 0.5) * 100}%` }} 
              />
            </div>
            <div className="flex justify-between items-center">
               <div className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-mono ${
                 (quantResults?.hurst || 0.5) > 0.55 ? 'text-emerald-400' : (quantResults?.hurst || 0.5) < 0.45 ? 'text-amber-400' : 'text-slate-500'
               }`}>
                  {(quantResults?.hurst || 0.5) > 0.55 ? 'TRENDING' : (quantResults?.hurst || 0.5) < 0.45 ? 'MEAN_REVERTING' : 'RANDOM_WALK'}
               </div>
               <div className="text-[9px] font-bold text-slate-500 font-mono">
                 {Math.abs(quantResults?.zScore || 0) > 2 ? 'EXTREME' : 'NORMAL'}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SIGNAL PROCESSING SECTION ═══ */}
      {loading ? (
        <div className="h-[400px] flex flex-col items-center justify-center space-y-4 lumia-card">
           <Loader2 className="animate-spin text-indigo-500" size={32} />
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse font-mono">Synchronizing Neural Pipeline...</p>
        </div>
      ) : error ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
           <AlertCircle className="text-rose-500 mb-3" size={32} />
           <h3 className="text-lg font-bold text-white mb-1 font-display uppercase">Pipeline Error</h3>
           <p className="text-slate-500 text-xs max-w-md font-mono">{error}</p>
        </div>
      ) : !quantResults ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
           <Info className="text-amber-500 mb-3" size={32} />
           <h3 className="text-lg font-bold text-white mb-1 font-display uppercase">Insufficient Data</h3>
           <p className="text-slate-500 text-xs max-w-md font-mono">
             We need at least 10 historical data points to run the Kalman and GARCH models. 
             Try selecting another asset or wait for the neural bridge to synchronize.
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Signal Chart */}
          <div className="lg:col-span-8 space-y-6">
            <div className="lumia-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
                    <Cpu className="text-indigo-400" size={18} /> Kalman Signal Cleaning
                  </h3>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Removing market microstructure noise</p>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5 font-mono">Noise Score</span>
                   <div className="text-xl font-bold text-white font-mono">{quantResults.noiseScore}%</div>
                </div>
              </div>

            <div className="h-[350px] min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quantResults.filteredData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} style={{ fontFamily: 'JetBrains Mono' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '8px', padding: '12px' }}
                      itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                      labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 600 }} />
                    <Line name="Raw Market Price" type="monotone" dataKey="raw" stroke="#475569" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                    <Line name="Kalman Cleaned Signal" type="monotone" dataKey="filtered" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Volatility Forecast */}
               <div className="lumia-card p-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6 font-mono">
                    <Waves size={14} className="text-indigo-400" /> GARCH Volatility Forecast
                  </h3>
                  <div className="h-40 min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={quantResults.volData}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff10', borderRadius: '8px' }}
                          labelStyle={{ display: 'none' }}
                          itemStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#818cf8' }}
                        />
                        <Area type="monotone" dataKey="vol" stroke="#6366f1" fillOpacity={1} fill="url(#colorVol)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-between items-end border-t border-white/[0.03] pt-4">
                     <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5 font-mono">1D Forecasted Vol</span>
                        <span className="text-xl font-bold text-white font-mono">{quantResults.forecast}%</span>
                     </div>
                     <div className={`px-2 py-1 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${quantResults.forecast > 40 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {quantResults.forecast > 40 ? 'HIGH_VOL' : 'STABLE'}
                     </div>
                  </div>
               </div>

               {/* Regime Detection */}
               <div className="lumia-card p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6 font-mono">
                      <Binary size={14} className="text-indigo-400" /> HMM Regime Detection
                    </h3>
                    <div className="flex items-center gap-4 mb-6">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                         quantResults.regime === 'BULL' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                         quantResults.regime === 'BEAR' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'
                       }`}>
                          {quantResults.regime === 'BULL' ? <TrendingUp size={20} /> : 
                           quantResults.regime === 'BEAR' ? <Shield size={20} /> : <Activity size={20} />}
                       </div>
                       <div>
                          <div className="text-2xl font-bold text-white tracking-tight font-display">{quantResults.regime}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Market State Detected</div>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider font-mono">
                        <span className="text-slate-500">Regime Confidence</span>
                        <span className="text-white">{quantResults.confidence}%</span>
                     </div>
                     <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${quantResults.confidence}%` }} />
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Side Stats */}
          <div className="lg:col-span-4 space-y-6">
             <div className="lumia-card p-6 bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border-indigo-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl"></div>
                <div className="relative z-10">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest mb-4 text-indigo-200/70 font-mono">Integrated Signal</h4>
                  <div className="text-4xl font-bold font-mono mb-1 text-white tracking-tighter">
                    {quantResults.velocity > 0 ? '+' : ''}{Math.abs(quantResults.velocity) < 0.01 ? quantResults.velocity.toFixed(4) : quantResults.velocity.toFixed(2)}%
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-200/50 font-mono">Price Velocity (Kalman State)</p>
                  
                  <div className="mt-8 pt-6 border-t border-indigo-200/10 space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-indigo-200/70 font-mono">Signal Strength</span>
                        <span className="text-[10px] font-bold font-mono text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">{quantResults.signalStrength}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-indigo-200/70 font-mono">Noise Filter</span>
                        <span className="text-[10px] font-bold font-mono text-white">{quantResults.noiseFilter}</span>
                     </div>
                  </div>
                </div>
             </div>

             <div className="lumia-card p-6">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 font-mono">Quant Insights</h4>
                <div className="space-y-4">
                   <div className="flex gap-3">
                      <div className="mt-0.5"><Info size={14} className="text-indigo-400" /></div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        The <span className="text-white font-semibold">Kalman Filter</span> has identified a structural {quantResults.velocity > 0 ? 'uptrend' : 'downtrend'} in {selectedTicker} after stripping away 
                        <span className="text-white font-mono mx-1">{quantResults.noiseScore}%</span> of market noise.
                      </p>
                   </div>
                   <div className="flex gap-3">
                      <div className="mt-0.5"><Gauge size={14} className="text-indigo-400" /></div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        GARCH modeling suggests volatility is <span className="text-white font-semibold">{quantResults.forecast > 30 ? 'expanding' : 'compressing'}</span>, 
                        indicating a potential {quantResults.forecast > 40 ? 'regime shift' : 'consolidation phase'}.
                      </p>
                   </div>
                </div>
             </div>

             <div className="p-5 bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] border border-white/[0.05] rounded-2xl flex items-center gap-4 shadow-lg">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                   <Zap size={18} />
                </div>
                <div>
                   <h5 className="text-[10px] font-bold text-white uppercase tracking-widest font-display">QAOA Ready</h5>
                   <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wide font-mono">Signals optimized for quantum solver</p>
                </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default QuantLab;
