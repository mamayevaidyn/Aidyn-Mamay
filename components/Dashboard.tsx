import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart as ReLineChart, Line } from 'recharts';
import { PortfolioState, Asset } from '../types';
import { 
  Shield, TrendingUp, Zap, Target, ArrowUpRight, 
  Activity, Cpu, Hexagon, ShieldCheck, BrainCircuit, 
  Sparkles, Layers, Globe, ArrowDownRight, ZapOff,
  BarChart3, LineChart, PieChart as PieIcon,
  Atom, Binary, Workflow, ChevronRight, AlertTriangle,
  Newspaper, Info, RefreshCw
} from 'lucide-react';
import { 
  calculateSignalMatrix, 
  calculateMarketMicrostructure,
  calculateStrategicScenarios,
  calculateRollingPortfolioRisk,
  MARKET_UNIVERSE
} from '../services/quantEngine';
import { getGlobalNewsWire, NewsItem } from '../services/geminiService';
import SimulationPulse from './SimulationPulse';

interface DashboardProps {
  portfolio: PortfolioState;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ portfolio, setActiveTab }) => {
  const hasAssets = portfolio.assets.length > 0;
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);

  // Fetch Global News
  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const wire = await getGlobalNewsWire();
        setNews(wire.slice(0, 4));
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, []);

  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    portfolio.assets.forEach(a => {
      sectors[a.sector] = (sectors[a.sector] || 0) + (a.price * (a.quantity || 0));
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value }));
  }, [portfolio.assets]);

  // Dynamic Signals based on portfolio or market universe
  const neuralSignals = useMemo(() => {
    const sourceAssets = hasAssets ? portfolio.assets : MARKET_UNIVERSE.slice(0, 5);
    return sourceAssets.slice(0, 3).map(asset => {
      const signals = calculateSignalMatrix(asset);
      const topSignal = signals.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        ticker: asset.ticker,
        type: topSignal.signal,
        desc: `${topSignal.model} // ${asset.sector} Momentum`,
        time: 'LIVE',
        conf: Math.round(topSignal.confidence * 100) + '%',
        color: topSignal.signal === 'BUY' ? 'text-emerald-500' : topSignal.signal === 'SELL' ? 'text-rose-500' : 'text-blue-400'
      };
    });
  }, [portfolio.assets, hasAssets]);

  // Synthetic Intelligence Insights
  const syntheticInsights = useMemo(() => {
    const topAsset = portfolio.assets[0] || MARKET_UNIVERSE[0];
    const microstructure = calculateMarketMicrostructure(topAsset);
    const scenarios = calculateStrategicScenarios(topAsset);
    
    return {
      nodes: Math.floor(portfolio.totalValue / 1000) + 64,
      drift: portfolio.metrics.volatility / 1000,
      regime: portfolio.regime,
      micro: microstructure,
      scenarios
    };
  }, [portfolio.assets, portfolio.totalValue, portfolio.metrics.volatility, portfolio.regime]);

  // Rolling Performance Data
  const rollingPerformance = useMemo(() => {
    return calculateRollingPortfolioRisk(portfolio.assets, 30);
  }, [portfolio.assets]);

  // Calculate fixed Y-axis domain to prevent jitter
  const yDomain = useMemo(() => {
    if (rollingPerformance.length === 0) return ['auto', 'auto'];
    const values = rollingPerformance.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Add 5% padding
    return [min * 0.95, max * 1.05];
  }, [rollingPerformance]);

  if (!hasAssets) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center relative overflow-hidden rounded-[40px] border border-white/5 bg-[#020203]">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8 border border-white/10 mx-auto">
            <ZapOff size={40} className="text-slate-700" />
          </div>
          <h2 className="syne text-3xl font-black text-white mb-4 uppercase tracking-tighter">Neural Core Offline</h2>
          <p className="text-slate-500 max-w-sm mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed mx-auto">
            Awaiting asset injection. Initialize your portfolio in the Architect terminal to begin real-time neural monitoring.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10 relative">
      
      {/* Neural Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Neural Metric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Net Value', 
            val: '$' + portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }), 
            sub: 'Neural Core Balance', 
            trend: 'up', 
            icon: <Activity size={20} className="text-emerald-500" />,
            glow: 'shadow-[0_0_30px_rgba(16,185,129,0.1)]'
          },
          { 
            label: 'Alpha Projection', 
            val: (portfolio.metrics.alpha >= 0 ? '+' : '') + portfolio.metrics.alpha.toFixed(2) + '%', 
            sub: 'vs Global Benchmark', 
            trend: portfolio.metrics.alpha > 0 ? 'up' : 'down', 
            icon: <TrendingUp size={20} className="text-indigo-500" />,
            color: portfolio.metrics.alpha > 0 ? 'text-emerald-500' : 'text-rose-500'
          },
          { 
            label: 'Risk Exposure', 
            val: portfolio.metrics.systemicRisk.toFixed(1) + '%', 
            sub: portfolio.metrics.volatility < 20 ? 'Optimal Stability' : 'High Variance', 
            trend: portfolio.metrics.volatility < 20 ? 'down' : 'up', 
            icon: <Shield size={20} className="text-slate-500" />,
            color: portfolio.metrics.volatility > 30 ? 'text-rose-500' : 'text-emerald-500'
          },
          { 
            label: 'Neural Efficiency', 
            val: (portfolio.metrics.alpha / (portfolio.metrics.volatility || 1) * 5 + 1).toFixed(2), 
            sub: 'Sharpe Efficiency', 
            trend: 'up', 
            icon: <Zap size={20} className="text-amber-500" /> 
          },
        ].map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5, borderColor: 'rgba(255,255,255,0.1)' }}
            className={`relative bg-[#0a0a0c] border border-white/5 rounded-[32px] p-6 lg:p-8 overflow-hidden group transition-all ${m.glow || ''}`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-white/[0.05] transition-colors"></div>
            <div className="relative z-10 flex justify-between items-start mb-4 lg:mb-6">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{m.label}</span>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">{m.icon}</div>
            </div>
            <div className={`text-3xl xl:text-4xl font-mono font-black tracking-tighter mb-2 ${m.color || 'text-white'}`}>
              {m.val}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${m.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {m.sub}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Performance & Allocation Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[40px] p-6 sm:p-10 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4">
            <div>
              <h3 className="syne text-xl sm:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <LineChart size={24} className="text-emerald-500" /> Lumia Performance
              </h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Cumulative Growth // 30D Window</p>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Real-Time Feed
              </div>
            </div>
          </div>

          <div className="h-[300px] sm:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rollingPerformance}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                  dy={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  tickFormatter={(val) => {
                    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
                    return `$${val}`;
                  }}
                  domain={yDomain}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }}
                  formatter={(value: any) => ['$' + Number(value).toLocaleString(), 'Value']}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sector Allocation Bento */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-6 lg:p-10 flex flex-col min-w-0"
        >
          <div className="mb-6 lg:mb-8">
            <h3 className="syne text-xl lg:text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3 truncate">
              <PieIcon size={24} className="text-indigo-500 shrink-0" /> Allocation
            </h3>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2 truncate">Sector Concentration</p>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar pr-2">
            {sectorData.sort((a, b) => b.value - a.value).map((sector, i) => {
              const weight = (sector.value / portfolio.totalValue) * 100;
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{sector.name}</span>
                    <span className="text-xs font-mono font-black text-white">{weight.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${weight}%` }}
                      transition={{ duration: 1.5, delay: i * 0.1 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck size={20} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Guard</div>
                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Diversification Optimal</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Signal Stream & Global Pulse & Simulation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Signal Stream */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10"
        >
          <div className="flex justify-between items-center mb-10">
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Zap size={20} className="text-amber-500" /> Neural Signals
            </h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Stream</span>
          </div>
          
          <div className="space-y-4">
            {neuralSignals.map((sig, i) => (
              <div key={i} className="flex gap-6 p-5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl transition-all group cursor-default">
                <div className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg bg-white/5 ${sig.color} h-fit`}>{sig.type}</div>
                <div className="flex-1">
                  <div className="text-sm font-black text-white mono tracking-tighter">{sig.ticker}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">{sig.desc}</div>
                </div>
                <div className="text-right shrink-0">
                   <div className={`text-sm font-black mono ${sig.color}`}>{sig.conf}</div>
                   <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest">{sig.time}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Global Market Pulse */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10"
        >
          <div className="flex justify-between items-center mb-10">
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Newspaper size={20} className="text-indigo-400" /> Global Pulse
            </h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Macro Feed</span>
          </div>
          
          <div className="space-y-6">
            {loadingNews ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <RefreshCw size={24} className="text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Syncing Global Wire...</span>
              </div>
            ) : news.length > 0 ? (
              news.map((item, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.sentiment === 'POSITIVE' ? 'bg-emerald-500' : item.sentiment === 'NEGATIVE' ? 'bg-rose-500' : 'bg-slate-500'}`} />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.source} // {item.region}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-relaxed group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No macro events detected</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Neural Simulation Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Atom size={120} className="text-indigo-500" />
          </div>
          
          <div className="flex justify-between items-center mb-10">
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <BrainCircuit size={20} className="text-indigo-400" /> Synthetic Intelligence
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Engine Active</span>
            </div>
          </div>

          <div className="space-y-8 relative z-10">
            <div>
              <div className="flex justify-between items-end mb-4">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Simulation Pulse</span>
                <span className="text-xs font-mono font-black text-white">GBM_PATH_04</span>
              </div>
              <div className="h-24 w-full">
                <SimulationPulse />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Active Nodes</div>
                <div className="text-lg font-black text-white mono">{syntheticInsights.nodes}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Drift Variance</div>
                <div className="text-lg font-black text-emerald-500 mono">{syntheticInsights.drift.toFixed(3)}</div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Neural simulation engine is currently synthesizing 10k+ stochastic paths for <span className="text-white font-bold">{portfolio.assets[0]?.ticker || 'Market Universe'}</span> to identify structural arbitrage opportunities in the <span className="text-indigo-400 font-bold">{portfolio.regime}</span> regime.
            </p>

            <button 
              onClick={() => setActiveTab('engine')}
              className="w-full py-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn"
            >
              Enter Simulation Core <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Active Inventory Table-Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-3 bg-[#0a0a0c] border border-white/5 rounded-[40px] overflow-hidden"
        >
          <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
             <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
               <Target size={24} className="text-indigo-500" /> Active Inventory
             </h3>
             <div className="flex gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified Feed</span>
               </div>
             </div>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-[800px]">
               <thead>
                  <tr className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-white/5 bg-white/[0.005]">
                     <th className="px-6 lg:px-10 py-4 lg:py-6">Instrument</th>
                     <th className="px-6 lg:px-10 py-4 lg:py-6 text-right">Price Chg.</th>
                     <th className="px-6 lg:px-10 py-4 lg:py-6 text-right">P/L (1D)</th>
                     <th className="px-6 lg:px-10 py-4 lg:py-6 text-right">Market Value</th>
                     <th className="px-6 lg:px-10 py-4 lg:py-6 text-right pr-6 lg:pr-10">Weight</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {portfolio.assets.map((a, i) => {
                    const mVal = a.price * (a.quantity || 0);
                    const weight = (mVal / portfolio.totalValue) * 100;
                    const isUp = (a.lastChange || 0) >= 0;
                    
                    return (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 lg:px-10 py-4 lg:py-8">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-black text-white border border-white/5 group-hover:scale-110 transition-transform">
                               {a.ticker.substring(0, 1)}
                             </div>
                             <div>
                               <div className="text-base font-black text-white tracking-tighter">{a.ticker}</div>
                               <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">{a.sector}</div>
                             </div>
                           </div>
                        </td>
                        <td className={`px-6 lg:px-10 py-4 lg:py-8 text-right font-mono text-sm font-black ${ isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isUp ? '+' : ''}{(a.lastChange || 0).toFixed(2)}%
                        </td>
                        <td className={`px-6 lg:px-10 py-4 lg:py-8 text-right font-mono text-sm font-black ${ (a.pl1d || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          ${(a.pl1d || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 lg:px-10 py-4 lg:py-8 text-right text-base font-black text-white mono">
                          ${mVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 lg:px-10 py-4 lg:py-8 text-right pr-6 lg:pr-10">
                           <div className="text-base font-black text-indigo-400 mono">{weight.toFixed(1)}%</div>
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
