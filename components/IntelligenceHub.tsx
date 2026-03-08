import React, { useState, useEffect } from 'react';
import { PortfolioState } from '../types';
import { synthesizeFullIntelligence, IntelligenceData } from '../services/geminiService';
import { fetchFinnhubFundamentals } from '../services/marketDataService';
import { 
  Globe, 
  RefreshCw, 
  Zap, 
  Activity, 
  BarChart4, 
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  BrainCircuit,
  Workflow,
  Database,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Target,
  Gauge,
  LineChart,
  Boxes,
  Landmark,
  Compass
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface IntelligenceHubProps {
  portfolio: PortfolioState;
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ portfolio }) => {
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFullIntelligence = async () => {
    if (scanning || portfolio.assets.length === 0) return;
    setScanning(true);
    setError(null);
    try {
      const intelData = await synthesizeFullIntelligence(portfolio);
      
      if (intelData) {
        setIntel(intelData);
      } else {
        setError("Neural bridge failed to synthesize data. Please retry.");
      }
    } catch (err) {
      console.error(err);
      setError("Critical system failure during data aggregation.");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (portfolio.assets.length > 0) {
      fetchFullIntelligence();
    } else {
      setIntel(null);
      setError(null);
    }
  }, [portfolio.assets.length]);

  if (portfolio.assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8 border border-white/10">
          <PackageOpen size={40} className="text-gray-600" />
        </div>
        <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Inventory Empty</h2>
        <p className="text-gray-500 max-w-sm mb-10 text-sm leading-relaxed">
          Intelligence Hub requires active assets to initiate quantum synthesis and risk correlation modeling.
        </p>
        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-indigo-400 animate-pulse">
          Add assets in the Portfolio tab to begin <ArrowRight size={14} />
        </div>
      </div>
    );
  }

  if (scanning && !intel) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
         <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin" />
         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Establishing Cognitive Datapoints...</p>
      </div>
    );
  }

  if (!intel) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <RefreshCw size={40} className="text-gray-600 mb-4 animate-spin" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Initializing Neural Bridge</h2>
        <p className="text-gray-500 text-sm mt-2">Synthesizing market intelligence...</p>
      </div>
    );
  }

  // Defensive data extraction for charts
  const normalize = (v: number) => v > 1 ? v / 100 : v;

  const regimeData = (intel && intel.regimeProbability) ? [
    { name: 'Expansion', value: normalize(intel.regimeProbability.transitionMatrix.toExpansion || 0) },
    { name: 'Transitional', value: normalize(intel.regimeProbability.transitionMatrix.toStagnation || 0) },
    { name: 'Contraction', value: normalize(intel.regimeProbability.transitionMatrix.toContraction || 0) },
  ] : [
    { name: 'Expansion', value: 0.33 },
    { name: 'Transitional', value: 0.33 },
    { name: 'Contraction', value: 0.34 },
  ];

  const REGIME_COLORS = ['#10b981', '#6366f1', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20 max-w-[1600px] mx-auto font-sans">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Market Intelligence</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Neural Synthesis Engine v5.0</p>
        </div>
        <button 
          onClick={fetchFullIntelligence}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:bg-indigo-500/20 transition-all disabled:opacity-50"
        >
          {scanning ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {scanning ? 'Calibrating...' : 'Refresh Intel'}
        </button>
      </div>

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="lumia-card p-6 flex flex-col justify-between bg-gradient-to-br from-indigo-900/20 to-[#0b0f1a]">
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Alpha Score</h3>
          <div className="text-5xl font-black text-white mono">{intel.alphaScore}</div>
          <p className="text-[10px] text-gray-500 mt-2">Relative to benchmark</p>
        </div>
        <div className="lumia-card p-6 flex flex-col justify-between">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Primary Action</h3>
          <div className="text-3xl font-black text-white uppercase">{intel.primaryAction}</div>
          <p className="text-[10px] text-gray-500 mt-2">Based on neural synthesis</p>
        </div>
        <div className="lumia-card p-6 flex flex-col justify-between">
          <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Confidence</h3>
          <div className="text-5xl font-black text-white mono">{((intel.confidence || 0) * 100).toFixed(0)}%</div>
          <p className="text-[10px] text-gray-500 mt-2">Model consensus</p>
        </div>
      </div>

      {/* ═══ STRATEGIC DIRECTIVE ═══ */}
      <div className="lumia-card p-8 border-indigo-500/20 bg-indigo-900/5">
        <div className="flex items-center gap-4 mb-4">
          <Compass className="text-indigo-400" size={24} />
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Strategic Directive</h2>
        </div>
        <p className="text-lg text-indigo-100 leading-relaxed">"{intel.strategicDirective}"</p>
      </div>

      {/* ═══ ACTIONABLE INSIGHTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lumia-card p-6">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap size={14} className="text-indigo-400" /> Actionable Insights
          </h3>
          <div className="space-y-4">
            {(intel.marketNavigationSignals || []).map((sig, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className={`px-2 py-1 rounded text-[9px] font-black uppercase self-start ${
                  sig.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                  sig.action === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>{sig.action}</div>
                <div>
                  <div className="text-xs font-bold text-white mb-1">{sig.ticker}</div>
                  <p className="text-[11px] text-gray-400">{sig.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RISK SENTINEL ═══ */}
        <div className="lumia-card p-6 bg-red-900/5 border-red-500/20">
          <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldAlert size={14} /> Risk Sentinel
          </h3>
          <div className="flex items-center gap-6 mb-6">
            <div className="text-4xl font-black text-white mono">{((intel.tailRisk?.probability || 0) * 100).toFixed(1)}%</div>
            <div>
              <div className="text-xs font-bold text-white uppercase">{intel.tailRisk?.event}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Tail Risk Probability</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 italic bg-red-500/10 p-4 rounded-xl">"{intel.tailRisk?.mitigation}"</p>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceHub;
