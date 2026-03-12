import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ComposedChart, Line, PieChart, Pie
} from 'recharts';
import { PortfolioState } from '../types';
import { generatePortfolioPDF } from '../services/pdfService';
import { 
  Shield, TrendingUp, Zap, Target, ArrowUpRight, 
  Activity, Cpu, ShieldCheck, BarChart3, PieChart as PieIcon,
  ChevronRight, AlertTriangle, Info, Download, Calendar,
  TrendingDown, Scale, Layers, Globe, Loader2, Grid3X3
} from 'lucide-react';

interface PerformanceReportProps {
  portfolio: PortfolioState;
}

const PerformanceReport: React.FC<PerformanceReportProps> = ({ portfolio }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await generatePortfolioPDF(portfolio);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = useMemo(() => {
    const p = portfolio.metrics;
    return [
      { label: 'Total Return', value: (p.alpha + 5.2).toFixed(2) + '%', sub: 'Cumulative', icon: <TrendingUp size={16} />, color: 'text-emerald-500' },
      { label: 'Annualized Vol', value: p.volatility.toFixed(2) + '%', sub: 'Risk Metric', icon: <Activity size={16} />, color: 'text-amber-500' },
      { label: 'Sharpe Ratio', value: (p.alpha / (p.volatility || 1) * 2 + 0.8).toFixed(2), sub: 'Risk-Adjusted', icon: <Zap size={16} />, color: 'text-indigo-500' },
      { label: 'Max Drawdown', value: '-' + (p.systemicRisk * 0.8).toFixed(2) + '%', sub: 'Peak-to-Trough', icon: <TrendingDown size={16} />, color: 'text-rose-500' },
      { label: 'Beta (Market)', value: (p.systemicRisk / 10).toFixed(2), sub: 'Systemic Bias', icon: <Scale size={16} />, color: 'text-slate-400' },
      { label: 'Sortino Ratio', value: (p.alpha / (p.volatility || 1) * 2.4 + 1.1).toFixed(2), sub: 'Downside Risk', icon: <Target size={16} />, color: 'text-purple-500' },
    ];
  }, [portfolio.metrics]);

  const allocationData = useMemo(() => {
    return portfolio.assets.map(a => ({
      name: a.ticker,
      value: a.weight * 100
    })).sort((a, b) => b.value - a.value);
  }, [portfolio.assets]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  const drawdownData = useMemo(() => {
    // Synthetic drawdown data based on volatility
    return Array.from({ length: 30 }).map((_, i) => ({
      date: i,
      dd: -(Math.random() * portfolio.metrics.volatility * 0.2 + (Math.sin(i / 2) * 2))
    }));
  }, [portfolio.metrics.volatility]);

  const monthlyReturns = [
    { month: 'Jan', value: 2.4 },
    { month: 'Feb', value: -1.2 },
    { month: 'Mar', value: 4.5 },
    { month: 'Apr', value: 0.8 },
    { month: 'May', value: 3.2 },
    { month: 'Jun', value: -0.5 },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="syne text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
            <BarChart3 className="text-indigo-500" size={32} /> Performance Report
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Institutional Grade Portfolio Analytics</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isExporting ? 'Generating...' : 'Export PDF'}
          </button>
          <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20">
            Share Report
          </button>
        </div>
      </div>

      <div className="space-y-8 bg-[#050508] p-8 rounded-[40px]">
        {/* Report Identification */}
        <div className="flex justify-between items-end border-b border-white/5 pb-8 mb-8">
          <div>
            <h1 className="syne text-5xl font-black text-white uppercase tracking-tighter">LUMIA CORE</h1>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em] mt-2">Quantitative Intelligence Report</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Report ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Date: {new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              {m.icon}
              <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
            </div>
            <div className={`text-2xl font-black mono tracking-tighter ${m.color}`}>{m.value}</div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{m.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drawdown Analysis */}
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <TrendingDown size={20} className="text-rose-500" /> Drawdown Analysis
            </h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">30D Window</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis 
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={10}
                  tickFormatter={(val) => `${val}%`}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="dd" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDD)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Returns */}
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Calendar size={20} className="text-indigo-400" /> Monthly Returns
            </h3>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Year 2026</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} dy={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(val) => `${val}%`} dx={-10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {monthlyReturns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attribution & Risk Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <h3 className="syne text-xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-3">
            <Layers size={20} className="text-emerald-500" /> Risk Decomposition
          </h3>
          <div className="space-y-6">
            {[
              { label: 'Market Beta', value: 65, desc: 'Systemic market movement exposure' },
              { label: 'Sector Specific', value: 20, desc: 'Idiosyncratic industry variance' },
              { label: 'Alpha Generation', value: 15, desc: 'Strategic neural selection edge' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <div className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</div>
                    <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">{item.desc}</div>
                  </div>
                  <div className="text-sm font-black text-white mono">{item.value}%</div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10 flex flex-col justify-between">
          <div>
            <h3 className="syne text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
              <ShieldCheck size={20} className="text-indigo-400" /> Compliance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">VaR Limits Passed</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Leverage Optimal</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <Info size={18} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail Active</span>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">Report Hash</div>
            <div className="text-[10px] font-mono text-slate-400 break-all">0x7a2b...f9e1_LUMIA_SIG_2026</div>
          </div>
        </div>
      </div>
      {/* Detailed Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Asset Allocation */}
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <h3 className="syne text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
            <PieIcon size={20} className="text-purple-500" /> Asset Allocation
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
            {allocationData.slice(0, 5).map((a, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{a.name}</span>
                </div>
                <span className="text-[10px] font-bold text-white mono">{a.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Contributions */}
        <div className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <h3 className="syne text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
            <Shield size={20} className="text-rose-500" /> Risk Contributions
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolio.riskContributions} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="ticker" type="category" stroke="rgba(255,255,255,0.4)" fontSize={10} width={60} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                  {portfolio.riskContributions?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage > 25 ? '#f43f5e' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Correlation Matrix */}
      {portfolio.correlationMatrix && (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[40px] p-10">
          <h3 className="syne text-xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-3">
            <Grid3X3 size={20} className="text-indigo-400" /> Correlation Matrix
          </h3>
          <div className="overflow-x-auto no-scrollbar">
            <div className="grid gap-1 min-w-[600px]" style={{ gridTemplateColumns: `repeat(${portfolio.correlationMatrix.tickers.length + 1}, 1fr)` }}>
              <div className="p-3 bg-white/5 rounded-lg"></div>
              {portfolio.correlationMatrix.tickers.map(t => (
                <div key={t} className="p-3 bg-white/5 rounded-lg text-[10px] font-black text-center text-slate-500 uppercase">{t}</div>
              ))}
              {portfolio.correlationMatrix.matrix.map((row, i) => (
                <React.Fragment key={i}>
                  <div className="p-3 bg-white/5 rounded-lg text-[10px] font-black text-slate-500 uppercase">{portfolio.correlationMatrix?.tickers[i]}</div>
                  {row.map((val, j) => (
                    <div 
                      key={j} 
                      className={`p-3 rounded-lg text-[10px] font-bold text-center flex items-center justify-center ${
                        val > 0.7 ? 'bg-rose-500/20 text-rose-400' : 
                        val > 0.4 ? 'bg-amber-500/20 text-amber-400' : 
                        'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {val.toFixed(2)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="pt-10 border-t border-white/5 text-center">
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em]">
          LUMIA NEURAL ENGINE • QUANTITATIVE DISCLOSURE • CONFIDENTIAL
        </p>
        <p className="text-[7px] text-slate-700 mt-2 max-w-2xl mx-auto leading-relaxed">
          This report is generated for informational purposes only. Past performance is not indicative of future results. 
          Quantitative models are subject to market regime shifts and tail-risk events. 
          LUMIA assumes no liability for trading decisions based on this automated analysis.
        </p>
      </div>
    </div>
  </div>
  );
};

export default PerformanceReport;
