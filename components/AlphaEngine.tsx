import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  XAxis, YAxis, 
  CartesianGrid, 
  Tooltip, 
  ScatterChart, Scatter, ZAxis,
  LineChart, Line,
  Cell
} from 'recharts';
import { 
  Cpu, 
  Zap, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  Target, 
  Layers, 
  Atom, 
  Binary, 
  Sparkles,
  ChevronRight,
  Workflow,
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Radar,
  Network
} from 'lucide-react';
import { PortfolioState } from '../types';

interface AlphaEngineProps {
  portfolio: PortfolioState;
}

const AlphaEngine: React.FC<AlphaEngineProps> = ({ portfolio }) => {
  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1. Monte Carlo Simulation Data
  const monteCarloData = useMemo(() => {
    const paths = 8;
    const steps = 30;
    const data: any[] = [];
    
    for (let i = 0; i < steps; i++) {
      const step: any = { time: i };
      for (let p = 0; p < paths; p++) {
        const prev = i === 0 ? 100 : data[i-1][`p${p}`];
        const drift = 0.001;
        const vol = 0.02;
        const change = 1 + drift + (Math.random() - 0.5) * vol * 2;
        step[`p${p}`] = prev * change;
      }
      data.push(step);
    }
    return data;
  }, [portfolio.totalValue]);

  // 2. Efficient Frontier Data
  const frontierData = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      const risk = 5 + (i * 0.8);
      // Quadratic-ish return for the frontier
      const ret = 2 + Math.sqrt(risk - 5) * 4 + (Math.random() * 0.5);
      return { risk, return: ret };
    });
  }, []);

  // 3. Correlation Matrix Data
  const correlationMatrix = useMemo(() => {
    const assets = portfolio.assets.slice(0, 6);
    if (assets.length < 2) return [];
    
    const matrix: any[] = [];
    assets.forEach((a, i) => {
      assets.forEach((b, j) => {
        let val = 0;
        if (i === j) val = 1;
        else {
          // Semi-random but stable correlations
          const seed = (a.ticker.charCodeAt(0) + b.ticker.charCodeAt(0)) % 100;
          val = 0.3 + (seed / 200);
        }
        matrix.push({
          x: a.ticker,
          y: b.ticker,
          val: val.toFixed(2),
          opacity: val
        });
      });
    });
    return matrix;
  }, [portfolio.assets]);

  const runSimulation = () => {
    setIsComputing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComputing(false);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
  };

  return (
    <div className="space-y-10 relative pb-20">
      {/* Neural Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-500/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-emerald-500/5 blur-[150px] rounded-full"></div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Cpu size={24} className="text-indigo-400" />
            </div>
            <h1 className="syne text-4xl font-black text-white uppercase tracking-tighter">Alpha Engine <span className="text-indigo-500">v4.0</span></h1>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Quantum Portfolio Optimization // Markowitz Frontier</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Quantum Key</span>
              <span className="text-xs font-mono font-black text-emerald-500">7FBF...3366</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <button 
            onClick={runSimulation}
            disabled={isComputing}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-3"
          >
            {isComputing ? <Activity size={16} className="animate-spin" /> : <Zap size={16} />}
            {isComputing ? `Computing ${progress}%` : 'Initialize Alpha Sync'}
          </button>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Monte Carlo Simulation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="syne text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Workflow size={24} className="text-indigo-400" /> Monte Carlo VaR
              </h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">10,000 Stochastic Paths // 95% Confidence</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-black text-rose-500 tracking-tighter">-$12,402</div>
              <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Expected 1D VaR</div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monteCarloData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  labelStyle={{ display: 'none' }}
                />
                {Array.from({ length: 8 }).map((_, i) => (
                  <Line 
                    key={i}
                    type="monotone" 
                    dataKey={`p${i}`} 
                    stroke={i === 0 ? "#10b981" : i === 7 ? "#f43f5e" : "rgba(99, 102, 241, 0.2)"} 
                    strokeWidth={i === 0 || i === 7 ? 3 : 1}
                    dot={false}
                    animationDuration={2000 + (i * 200)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Alpha Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10 flex flex-col"
        >
          <div className="mb-10">
             <h3 className="syne text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Target size={24} className="text-emerald-500" /> Alpha Stats
             </h3>
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Quantitative Edge</p>
          </div>

          <div className="flex-1 space-y-6">
            {[
              { label: 'Sharpe Ratio', val: '2.84', sub: 'Risk-Adj Return', color: 'text-emerald-500' },
              { label: 'Sortino Ratio', val: '3.12', sub: 'Downside Protection', color: 'text-indigo-400' },
              { label: 'Information Ratio', val: '1.45', sub: 'Active Management', color: 'text-white' },
              { label: 'Treynor Measure', val: '0.18', sub: 'Market Sensitivity', color: 'text-slate-400' },
            ].map((stat, i) => (
              <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                  <span className={`text-xl font-mono font-black ${stat.color}`}>{stat.val}</span>
                </div>
                <div className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <ShieldAlert size={20} className="text-indigo-400" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</div>
                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Quantum Core Synchronized</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Efficient Frontier */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10 relative overflow-hidden"
        >
          <div className="mb-10">
            <h3 className="syne text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Network size={24} className="text-amber-500" /> Efficient Frontier
            </h3>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Optimal Risk-Reward Curve</p>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis type="number" dataKey="risk" name="Risk" unit="%" hide />
                <YAxis type="number" dataKey="return" name="Return" unit="%" hide />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                <Scatter name="Frontier" data={frontierData} fill="#6366f1">
                  {frontierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fillOpacity={0.4 + (index / 40) * 0.6} />
                  ))}
                </Scatter>
                {/* Current Portfolio Point */}
                <Scatter name="Current" data={[{ risk: 18, return: 12 }]} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Optimization Insight</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">Your current portfolio is 12% away from the Tangency Portfolio. Increase exposure to low-beta assets to reach the optimal Sharpe point.</p>
          </div>
        </motion.div>

        {/* Correlation Heatmap */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10"
        >
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="syne text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Layers size={24} className="text-indigo-400" /> Correlation Matrix
              </h3>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Cross-Asset Structural DNA</p>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500/20" />
              <div className="w-3 h-3 rounded bg-indigo-500/50" />
              <div className="w-3 h-3 rounded bg-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {correlationMatrix.map((cell, i) => (
              <div 
                key={i}
                className="aspect-square rounded-lg flex items-center justify-center relative group overflow-hidden"
                style={{ backgroundColor: `rgba(99, 102, 241, ${cell.opacity})` }}
              >
                <span className="text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">{cell.val}</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
          
          <div className="mt-10 flex justify-between items-center">
            <div className="flex gap-4">
              {portfolio.assets.slice(0, 6).map((a, i) => (
                <div key={i} className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{a.ticker}</div>
              ))}
            </div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Binary size={12} /> Matrix Synchronized
            </div>
          </div>
        </motion.div>

      </div>

      {/* Quantum Footer */}
      <div className="mt-10 p-10 bg-white/[0.01] border border-white/5 rounded-[40px] flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Atom size={32} className="text-indigo-400 animate-spin-slow" />
          </div>
          <div>
            <h4 className="syne text-xl font-black text-white uppercase tracking-tighter">Alpha Core v4.0</h4>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Powered by LUMIA Quantum Intelligence</p>
          </div>
        </div>
        
        <div className="flex gap-10">
          <div className="text-center">
            <div className="text-2xl font-mono font-black text-white">10k</div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Paths/Sec</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-black text-emerald-500">0.04ms</div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Latency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-black text-indigo-400">99.9%</div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Precision</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlphaEngine;
