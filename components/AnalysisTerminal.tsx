import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { PortfolioState } from '../types';
import { generateBacktestData } from '../services/quantEngine';
import { 
  Shield, 
  TrendingUp, 
  BarChart as BarChartIcon, 
  BarChart3,
  History, 
  Target, 
  Info, 
  AlertCircle, 
  Zap,
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react';

import { generatePortfolioPDF } from '../services/pdfService';

interface AnalysisTerminalProps {
  portfolio: PortfolioState;
}

const AnalysisTerminal: React.FC<AnalysisTerminalProps> = ({ portfolio }) => {
  const backtest = useMemo(() => generateBacktestData(portfolio.assets), [portfolio.assets]);
  const [showBenchExplanation, setShowBenchExplanation] = useState(false);
  const [activeView, setActiveView] = useState<'attribution' | 'risk' | 'correlation' | 'montecarlo'>('attribution');
  const [learningMode, setLearningMode] = useState(false);

  const sectorAttribution = useMemo(() => {
    const sectors: Record<string, number> = {};
    portfolio.assets.forEach(a => {
      sectors[a.sector] = (sectors[a.sector] || 0) + (a.weight * 100);
    });
    const benchmarkSectors: Record<string, number> = {
      'Technology': 28,
      'Financials': 13,
      'Healthcare': 12,
      'Consumer Cyclical': 11,
      'Communication': 9,
      'Other': 27
    };
    
    return Object.keys(sectors).map(s => ({
      name: s,
      portfolio: sectors[s],
      benchmark: benchmarkSectors[s] || 5
    }));
  }, [portfolio.assets]);

  const getCorrelationColor = (val: number) => {
    if (val > 0.8) return 'bg-red-500/40';
    if (val > 0.5) return 'bg-orange-500/30';
    if (val > 0.2) return 'bg-yellow-500/20';
    if (val > -0.2) return 'bg-emerald-500/10';
    return 'bg-blue-500/20';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
             Quant Strategy Lab
             <span className="text-[10px] font-black bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-gray-400 uppercase tracking-widest">Monte Carlo Sim v3</span>
          </h2>
          <p className="text-gray-500 mt-1">Statistical backtesting via Geometric Brownian Motion (GBM) simulation.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setLearningMode(!learningMode)}
            className={`px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${learningMode ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
          >
            <Zap size={16} className={learningMode ? 'fill-current' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{learningMode ? 'Learning Mode ON' : 'Learning Mode OFF'}</span>
          </button>
          <div className="bg-indigo-600/10 border border-indigo-500/20 px-6 py-3 rounded-2xl flex items-center gap-4 group hover:border-indigo-500/40 transition-all relative">
            {learningMode && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 bg-emerald-900/90 text-emerald-100 p-3 rounded-xl text-[10px] border border-emerald-500/30 backdrop-blur-xl z-50">
                <strong>Sharpe Ratio:</strong> Measures return per unit of risk. {'>'}1 is good, {'>'}2 is excellent. Formula: (Rp - Rf) / σp
              </div>
            )}
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform"><TrendingUp size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Sharpe Ratio</p>
              <p className="text-xl font-bold text-white mono">{backtest.metrics.sharpe}</p>
            </div>
          </div>
          <div className="bg-red-600/10 border border-red-500/20 px-6 py-3 rounded-2xl flex items-center gap-4 group hover:border-red-500/40 transition-all relative">
            {learningMode && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 bg-emerald-900/90 text-emerald-100 p-3 rounded-xl text-[10px] border border-emerald-500/30 backdrop-blur-xl z-50">
                <strong>Max Drawdown:</strong> The largest peak-to-trough decline. Measures downside risk. "How much could I lose in the worst case?"
              </div>
            )}
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400 group-hover:scale-110 transition-transform"><Shield size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Max Drawdown</p>
              <p className="text-xl font-bold text-white mono">{backtest.metrics.maxDrawdown}%</p>
            </div>
          </div>
          <button 
            onClick={() => generatePortfolioPDF(portfolio)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <BarChart3 size={14} />
            Generate Full PDF Report
          </button>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {[
          { id: 'attribution', label: 'Attribution', icon: <Activity size={14} /> },
          { id: 'risk', label: 'Risk Decomposition', icon: <Shield size={14} /> },
          { id: 'correlation', label: 'Correlation Matrix', icon: <Layers size={14} /> },
          { id: 'montecarlo', label: 'Monte Carlo', icon: <TrendingUp size={14} /> },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id as any)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeView === view.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {/* Main Simulation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 standard-card p-10 bg-[#0b0f1a]">
          {activeView === 'attribution' && (
            <>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <History className="text-indigo-400" size={24} /> Performance Attribution
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Baseline: S&P 500 Index (BETA)</span>
                    <button 
                      onClick={() => setShowBenchExplanation(!showBenchExplanation)}
                      className="text-gray-700 hover:text-indigo-400 transition-colors"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col text-right">
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Alpha Generation</span>
                   <span className="text-2xl font-bold text-white mono">{backtest.metrics.alpha}% <span className="text-sm font-normal text-gray-500">p.a.</span></span>
                </div>
              </div>

              {showBenchExplanation && (
                <div className="mb-8 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
                   <Info className="text-indigo-400 shrink-0 mt-1" size={20} />
                   <div className="text-xs text-gray-400 leading-relaxed space-y-2 font-medium">
                      <p><strong className="text-indigo-300">Why compare with S&P 500?</strong> Most of a portfolio's movement comes from general market drift (Beta). By comparing your portfolio to a benchmark, LUMIA can separate <span className="text-white italic">"Luck/Market Movement"</span> from <span className="text-white italic">"Strategy Alpha"</span>.</p>
                      <p>If the benchmark goes up 10% and you go up 12%, your <strong>Alpha</strong> is 2%. That is the true value your strategy is adding beyond just "being in the market".</p>
                   </div>
                </div>
              )}

              <div className="h-[450px] min-h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={backtest.data}>
                    <defs>
                      <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '1rem', padding: '15px' }}
                      itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area name="Lumia Strategy (NAV)" type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorPort)" strokeWidth={3} />
                    <Area name="Market Baseline (BETA)" type="monotone" dataKey="benchmark" stroke="#475569" fillOpacity={1} fill="url(#colorBench)" strokeWidth={1.5} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {activeView === 'risk' && (
            <div className="h-full flex flex-col">
              <h3 className="text-xl font-bold text-white mb-10 flex items-center gap-3">
                <Shield className="text-indigo-400" size={24} /> Risk Contribution Analysis
              </h3>
              <div className="flex-1 min-h-[400px] h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div style={{ height: `${Math.max(400, portfolio.riskContributions.length * 40)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={portfolio.riskContributions} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                      <XAxis type="number" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="ticker" type="category" stroke="#94a3b8" fontSize={10} width={60} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-4 bg-[#020617] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{data.ticker} Risk Contribution</p>
                                <p className="text-xl font-bold text-white mono">{data.percentage}%</p>
                                <p className="text-[9px] text-gray-500 mt-2 uppercase">Primary Volatility Driver</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="percentage" 
                        name="Risk Contribution %" 
                        radius={[0, 4, 4, 0]}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      >
                        {portfolio.riskContributions?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.percentage > 30 ? '#ef4444' : '#6366f1'} 
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong className="text-white uppercase tracking-widest text-[10px] block mb-2">Risk Interpretation:</strong>
                  The chart above decomposes your portfolio's total volatility into individual asset contributions. 
                  Assets with high risk contributions (red) are the primary drivers of your portfolio's variance.
                </p>
              </div>
            </div>
          )}

          {activeView === 'correlation' && portfolio.correlationMatrix && (
            <div className="h-full flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-white mb-10 flex items-center gap-3 self-start">
                <Layers className="text-indigo-400" size={24} /> Asset Correlation Matrix
              </h3>
              <div className="grid overflow-auto max-w-full" style={{ gridTemplateColumns: `repeat(${portfolio.correlationMatrix.tickers.length + 1}, minmax(80px, 1fr))` }}>
                <div className="p-4 border border-white/5 bg-white/5"></div>
                {portfolio.correlationMatrix.tickers.map(ticker => (
                  <div key={ticker} className="p-4 border border-white/5 bg-white/5 text-[10px] font-black text-center text-gray-400 uppercase">
                    {ticker}
                  </div>
                ))}
                
                {portfolio.correlationMatrix.matrix.map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="p-4 border border-white/5 bg-white/5 text-[10px] font-black text-gray-400 uppercase">
                      {portfolio.correlationMatrix?.tickers[i]}
                    </div>
                    {row.map((val, j) => (
                      <div 
                        key={j} 
                        className={`p-4 border border-white/5 text-[10px] text-center font-bold flex items-center justify-center transition-all ${getCorrelationColor(val)} ${val > 0.5 ? 'text-white' : 'text-gray-400'}`}
                      >
                        {val.toFixed(2)}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-10 flex gap-6 text-[9px] uppercase font-black tracking-widest text-gray-500">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500/40 rounded-full" /> High Positive</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500/10 rounded-full" /> Neutral</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500/20 rounded-full" /> Negative</div>
              </div>
            </div>
          )}
          
          {activeView === 'montecarlo' && (
            <div className="h-full flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <TrendingUp className="text-indigo-400" size={24} /> Monte Carlo Projection (100 Paths)
              </h3>
              <div className="flex-1 min-h-[400px] h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({ length: 30 }, (_, i) => {
                    // Generate 30 days of mock Monte Carlo paths
                    const base = 100 * Math.pow(1 + (backtest.metrics.alpha / 100 / 252), i);
                    const volatility = backtest.metrics.volatility / 100 / Math.sqrt(252);
                    
                    const paths: any = { day: i };
                    // Generate 100 paths
                    for (let p = 0; p < 100; p++) {
                      // Simple GBM approximation for visualization
                      const randomShock = (Math.random() - 0.5) * 2;
                      paths[`path_${p}`] = base * (1 + volatility * randomShock * Math.sqrt(i));
                    }
                    // Add P50, P5, P95
                    paths.p50 = base;
                    paths.p95 = base * (1 + 1.645 * volatility * Math.sqrt(i));
                    paths.p5 = base * (1 - 1.645 * volatility * Math.sqrt(i));
                    
                    return paths;
                  })}>
                    <defs>
                      <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="day" hide />
                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p50 = payload.find(p => p.name === "Median (P50)")?.value;
                          const p95 = payload.find(p => p.name === "P95 (Best Case)")?.value;
                          const p5 = payload.find(p => p.name === "P5 (Worst Case)")?.value;
                          
                          return (
                            <div className="p-4 bg-[#020617] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Day {label} Projection</p>
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
                    {/* Render faint paths */}
                    {Array.from({ length: 100 }).map((_, i) => (
                      <Area key={i} type="monotone" dataKey={`path_${i}`} stroke="#6366f1" strokeOpacity={0.05} fill="none" strokeWidth={1} isAnimationActive={false} />
                    ))}
                    {/* Render Confidence Intervals */}
                    <Area name="P95 (Best Case)" type="monotone" dataKey="p95" stroke="#10b981" strokeDasharray="3 3" fill="none" strokeWidth={2} />
                    <Area name="P5 (Worst Case)" type="monotone" dataKey="p5" stroke="#ef4444" strokeDasharray="3 3" fill="none" strokeWidth={2} />
                    <Area name="Median (P50)" type="monotone" dataKey="p50" stroke="#ffffff" fill="url(#colorP50)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong className="text-white uppercase tracking-widest text-[10px] block mb-2">Simulation Insight:</strong>
                  This chart projects 100 potential future price paths based on your portfolio's current volatility ({backtest.metrics.volatility}%) and drift. 
                  The <span className="text-white font-bold">White Line</span> is the most likely outcome (Median). 
                  The <span className="text-emerald-400 font-bold">Green</span> and <span className="text-rose-400 font-bold">Red</span> dashed lines represent the 95% confidence interval (Best/Worst case scenarios).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <div className="standard-card p-8 flex flex-col items-center text-center justify-center min-h-[200px]">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
              <Target size={24} />
            </div>
            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Portfolio Beta</h4>
            <div className="text-3xl font-bold text-white mono">{backtest.metrics.beta}</div>
            <p className="text-[10px] text-gray-600 mt-2 italic">Relative Market Sensitivity</p>
          </div>

          <div className="standard-card p-8 flex flex-col items-center text-center justify-center min-h-[200px]">
            <div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-400 mb-4">
              <History size={24} />
            </div>
            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Annu. Volatility</h4>
            <div className="text-3xl font-bold text-white mono">{backtest.metrics.volatility}%</div>
            <p className="text-[10px] text-gray-600 mt-2 italic">Standard Risk Dispersion</p>
          </div>

          <div className="standard-card p-8 bg-indigo-600 text-white flex flex-col items-center text-center justify-center min-h-[200px] shadow-xl shadow-indigo-600/20">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Model Confidence</h4>
            <div className="text-4xl font-bold mono">{portfolio.metrics.regimeConfidence || 84}%</div>
            <p className="text-[10px] mt-4 font-bold uppercase tracking-tight">Strategy_Locked</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Active Weighting Attribution */}
         <div className="standard-card p-10 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-10 flex items-center gap-3">
              <BarChartIcon className="text-indigo-400" size={22} /> Active Sector Attribution
            </h3>
            <div className="space-y-8 overflow-y-auto pr-4 custom-scrollbar max-h-[500px]">
              {sectorAttribution.map(s => (
                <div key={s.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-white uppercase tracking-tight">{s.name}</span>
                    <div className="text-right">
                       <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter block">Allocation Diff: { (s.portfolio - s.benchmark).toFixed(1) }%</span>
                    </div>
                  </div>
                  <div className="h-6 w-full flex gap-1 items-center">
                    <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden flex">
                       <div 
                        className="h-full bg-indigo-500 transition-all duration-1000" 
                        style={{ width: `${s.portfolio}%` }} 
                       />
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold w-12 text-right">{s.portfolio.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-end pr-14">
                     <div className="w-32 flex items-center gap-2">
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                           <div className="h-full bg-gray-600" style={{ width: `${s.benchmark}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-gray-600 font-bold w-8">{s.benchmark}%</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-8 border-t border-white/5 flex gap-6 text-[9px] font-black uppercase tracking-widest text-gray-600">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" /> Your Allocation
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full" /> S&P 500 Weight
               </div>
            </div>
         </div>

         {/* Strategy Optimization */}
         <div className="standard-card p-10 flex flex-col justify-center items-center text-center bg-gradient-to-b from-[#0b0f1a] to-[#020617]">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20 shadow-2xl">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Active Risk Alert</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-10 leading-relaxed font-medium">
              Your strategy is currently <span className="text-white">Underweighted</span> in Financials compared to the global benchmark. This creates an active risk bias of -1.4% drift.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
               <div className="bg-[#020617] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">Tracking Error</span>
                  <span className="text-lg font-bold text-white mono">2.1%</span>
               </div>
               <div className="bg-[#020617] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">Information Ratio</span>
                  <span className="text-lg font-bold text-white mono">1.34</span>
               </div>
            </div>
            <button className="w-full max-w-sm py-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3">
              <Zap size={18} /> Rebalance Strategy
            </button>
         </div>
      </div>
    </div>
  );
};

export default AnalysisTerminal;
